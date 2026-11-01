export type Category = 
  | 'All' 
  | 'Stage' 
  | 'Entrance' 
  | 'Mandap' 
  | 'Table' 
  | 'Backdrops'
  | 'Welcome Board';

export interface DecorationItem {
  id: number;
  cat: Category | string;
  t: string;
  d: string;
  p: number;
  u?: string | undefined;
  h?: number | undefined;
  g: [string, string];
  e: string;
  img: string;
  vendor: string;
  ownerCompanyId?: string | undefined;
  ownerCompanyName?: string | undefined;
  imagesCount?: number | undefined;
  tags?: string[] | undefined;
}

export interface InquiryFormData {
  name: string;
  phone: string;
  email: string;
  date: string;
  location: string;
  message: string;
}
