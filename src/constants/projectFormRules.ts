export const PROJECT_FORM_RULES = {
  titleMax: 150,
  slugMax: 180,
  descriptionMax: 5000,
  locationMax: 150,
  yearMin: 2000,
  yearMax: 2100,
  imageSourceMaxBytes: 100 * 1024 * 1024,
  imageMaxBytes: 10 * 1024 * 1024,
  videoMaxBytes: 100 * 1024 * 1024,
  groupMaxFiles: 12,
  totalMaxBytes: 150 * 1024 * 1024,
} as const

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'
export const VIDEO_ACCEPT = 'video/mp4,video/webm'
