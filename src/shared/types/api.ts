export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: ApiErrorBody };

export interface PublicDomain {
  id: number;
  domain: string;
  name: string;
  tld: string;
  description: string;
  category: string | null;
  categories: string[];
  is_featured: boolean;
  registered_at: string | null;
  expires_at: string | null;
  registrar_name?: string | null;
  public_price?: string | null;
}

/** 页脚左侧友情链接。display_mode 决定这一条渲染 LOGO、文字还是两者。 */
export type FriendLinkDisplayMode = "logo_text" | "logo_only" | "text_only";

export interface FriendLink {
  id: number;
  name: string;
  url: string;
  logo_url: string | null;
  display_mode: FriendLinkDisplayMode;
  sort_order: number;
}

export interface PublicHomeData {
  tlds: string[];
  categories: string[];
  categoryCounts: Record<string, number>;
  total_domains: number;
  total_tlds: number;
  total_featured: number;
  featured_domains: PublicDomain[];
  latestAddedAt: string | null;
  total: number;
  tldCount: number;
  featuredCount: number;
}

export interface FeaturedDomainRecord extends PublicDomain {
  registrar_name: string | null;
  updated_at: string;
  character_count: number;
  type: string;
}

export interface FeaturedDomainRecommendation {
  id: number;
  domain: string;
  name: string;
  tld: string;
  is_featured: boolean;
}

export interface FeaturedDomainDetail {
  domain: FeaturedDomainRecord;
  same_tld: FeaturedDomainRecommendation[];
  same_length: FeaturedDomainRecommendation[];
  site: {
    name: string;
    description: string;
    logo_url: string | null;
    favicon_url: string | null;
  };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
