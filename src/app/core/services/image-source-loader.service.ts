import { Injectable } from '@angular/core';

export interface LoaderAttemptResult {
  blob: Blob;
  resolvedUrl: string;
  providerHost: string;
  timeMs: number;
  hedged: boolean;
}

interface ProviderHealth {
  consecutiveFailures: number;
  deprioritizedUntil: number; // Timestamp ms
}

@Injectable({
  providedIn: 'root',
})
export class ImageSourceLoader {
  // Session memory for provider health: host -> status
  private static providerHealthMap = new Map<string, ProviderHealth>();
  private static readonly DEPRIORITIZE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Adaptive timeout calculation based on Network Information API.
   * Returns 2500ms for slow/saveData connections, 1500ms for high-speed connections.
   */
  public getAdaptiveTimeoutMs(): number {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = (navigator as unknown as { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
      if (conn?.saveData || conn?.effectiveType === '2g' || conn?.effectiveType === '3g') {
        return 2500;
      }
    }
    return 1500;
  }

  /**
   * Sorts candidate URLs prioritizing currently healthy providers over deprioritized ones.
   */
  public sortUrlsByProviderHealth(urls: string[]): string[] {
    const now = Date.now();
    return [...urls].sort((a, b) => {
      const hostA = this.extractHost(a);
      const hostB = this.extractHost(b);
      const healthA = ImageSourceLoader.providerHealthMap.get(hostA);
      const healthB = ImageSourceLoader.providerHealthMap.get(hostB);

      const isDeprioritizedA = healthA && healthA.deprioritizedUntil > now;
      const isDeprioritizedB = healthB && healthB.deprioritizedUntil > now;

      if (isDeprioritizedA && !isDeprioritizedB) return 1;
      if (!isDeprioritizedA && isDeprioritizedB) return -1;
      return 0;
    });
  }

  /**
   * Loads image bytes with adaptive timeout, hedged secondary requests, and provider failover.
   * Cancels in-flight losers via AbortController as soon as the first succeeds.
   */
  async load(urls: string[], outerSignal?: AbortSignal): Promise<LoaderAttemptResult> {
    if (!urls || urls.length === 0) {
      throw new Error('ImageSourceLoader: no candidate URLs provided');
    }

    const sortedUrls = this.sortUrlsByProviderHealth(urls);
    const timeoutMs = this.getAdaptiveTimeoutMs();
    const startTime = Date.now();

    // Try primary URL first, racing against secondary with hedge timeout
    return new Promise((resolve, reject) => {
      let resolved = false;
      const controllers: AbortController[] = [];
      let pendingAttempts = 0;
      const errors: Error[] = [];

      const cleanup = () => {
        controllers.forEach((c) => {
          try {
            c.abort();
          } catch {
            // Ignore already aborted
          }
        });
      };

      if (outerSignal) {
        outerSignal.addEventListener('abort', () => {
          cleanup();
          reject(new Error('Image fetch aborted by caller'));
        });
      }

      const launchAttempt = (url: string, index: number, isHedged: boolean) => {
        if (resolved) return;
        pendingAttempts++;

        const controller = new AbortController();
        controllers.push(controller);
        const host = this.extractHost(url);

        // Fetch wrapper
        const attemptFetch = async () => {
          try {
            const isLocal = url.startsWith('blob:') || url.startsWith('data:');
            const resp = await fetch(url, {
              signal: controller.signal,
              cache: isLocal ? 'default' : 'force-cache',
            });

            if (!resp.ok) {
              throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
            }

            const blob = await resp.blob();

            if (!resolved) {
              resolved = true;
              this.markProviderSuccess(host);
              cleanup();
              resolve({
                blob,
                resolvedUrl: url,
                providerHost: host,
                timeMs: Date.now() - startTime,
                hedged: isHedged,
              });
            }
          } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            errors.push(new Error(`Failed ${url}: ${error.message}`));
            this.markProviderFailure(host);

            pendingAttempts--;
            if (!resolved) {
              // If this was primary and secondary hasn't been launched yet, launch immediately
              if (index === 0 && sortedUrls.length > 1 && controllers.length === 1) {
                launchAttempt(sortedUrls[1], 1, true);
              } else if (pendingAttempts === 0) {
                reject(
                  new Error(
                    `All image sources failed (${errors.map((e) => e.message).join('; ')})`
                  )
                );
              }
            }
          }
        };

        attemptFetch();
      };

      // 1. Launch Primary
      launchAttempt(sortedUrls[0], 0, false);

      // 2. Schedule Hedged Request for URL 1 if primary hasn't replied within timeout
      if (sortedUrls.length > 1) {
        setTimeout(() => {
          if (!resolved && controllers.length === 1) {
            launchAttempt(sortedUrls[1], 1, true);
          }
        }, timeoutMs);
      }
    });
  }

  private extractHost(url: string): string {
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return new URL(url).hostname;
      }
      return 'local';
    } catch {
      return 'unknown';
    }
  }

  private markProviderSuccess(host: string): void {
    if (host === 'local' || host === 'unknown') return;
    ImageSourceLoader.providerHealthMap.set(host, {
      consecutiveFailures: 0,
      deprioritizedUntil: 0,
    });
  }

  private markProviderFailure(host: string): void {
    if (host === 'local' || host === 'unknown') return;
    const current = ImageSourceLoader.providerHealthMap.get(host) || {
      consecutiveFailures: 0,
      deprioritizedUntil: 0,
    };
    current.consecutiveFailures++;
    if (current.consecutiveFailures >= 2) {
      current.deprioritizedUntil = Date.now() + ImageSourceLoader.DEPRIORITIZE_DURATION_MS;
    }
    ImageSourceLoader.providerHealthMap.set(host, current);
  }

  /**
   * Resets provider health session memory (useful in unit testing).
   */
  public static resetHealthMemory(): void {
    ImageSourceLoader.providerHealthMap.clear();
  }
}

