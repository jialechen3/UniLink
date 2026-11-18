export interface University {
  id: number
  slug: string
  name: string
  short_name: string
  city: string
  state: string
  latitude: number
  longitude: number
  email_domains: string[]
  brand_color: string
  initials: string
  logo_url: string | null
}

export interface User {
  id: number
  name: string
  email: string
  university: University | null
  student_verified: boolean
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export interface ListingSeller {
  id: number
  name: string
  university: University
  joined_at: string
  student_verified: boolean
}

export interface Listing {
  id: number
  university: University
  seller: ListingSeller
  title: string
  price: string
  description: string
  category: string
  condition: string
  image_url: string
  location: string
  status: 'available' | 'sold'
  created_at: string
  updated_at: string
}

export interface ListingPage {
  items: Listing[]
  page: number
  page_size: number
  total: number
}

export interface CampusEvent {
  id: number
  organization_name: string
  title: string
  starts_at: string
  campus_location: string
  description: string
  attendee_count: number
  attending: boolean
  creator_id: number
  created_at: string
}

export interface Conversation {
  id: number
  listing_id: number
  listing_title: string
  other_user_id: number
  other_user_name: string
  created_at: string
}

export interface Message {
  id: number
  sender_id: number
  sender_name: string
  body: string
  created_at: string
}

export interface LocationResult {
  available: boolean
  distance_miles: number | null
  near_campus: boolean
  simulated: boolean
  message: string
}