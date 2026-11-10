/**
 * Visual Zine (Story Mode) Models.
 */

export interface ZinePage {
  pageNumber: number;
  photoId?: string;
  layout: 'hero' | 'diptych' | 'text-left' | 'text-right' | 'quote' | 'statement';
  title?: string;
  leadParagraph?: string;
  shootingNotes?: string;
  locationName?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  pullQuote?: string;
}

export interface ZineCollection {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  photographerStatement?: string;
  coverPhotoId: string;
  publishedDate: string;
  pages: ZinePage[];
}
