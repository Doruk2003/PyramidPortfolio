export interface Category {
  id: number
  name: string
  slug: string
}

export interface CategoryFilterItem extends Category {
  projectCount: number
}
