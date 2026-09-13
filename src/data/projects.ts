import type { ProjectRecord } from '../types/Project'

import project1 from '../assets/images/project-1.jpeg'
import project2 from '../assets/images/project-2.jpeg'
import project3 from '../assets/images/project-3.jpeg'

export const projects: ProjectRecord[] = [
  {
    id: 1,
    title: 'Villa Bioclimatic Pergola',
    slug: 'modern-villa-projesi',
    categoryIds: [1],

    description:
      'Villa terasında gün ışığı ve havalandırmayı kontrol eden hareketli lamelli bioclimatic pergola sistemi için hazırlanan örnek tasarım ve 3D görselleştirme çalışması.',

    location: 'Antalya',
    year: 2026,
    status: 'completed',

    image: project1,

    gallery: [project1, project2],

    applicationImages: [project3],

    videoUrl: '',
  },

  {
    id: 2,
    title: 'Residence Cam Balkon',
    slug: 'residence-ic-mekan',
    categoryIds: [6],

    description:
      'Residence balkonunu hava koşullarından korumaya yönelik cam balkon sistemi için hazırlanan örnek tasarım ve görselleştirme çalışması.',

    location: 'İstanbul',
    year: 2026,
    status: 'completed',

    image: project2,

    gallery: [project2, project1],

    applicationImages: [],

    videoUrl: '',
  },

  {
    id: 3,
    title: 'Ofis Giyotin Cam Sistemi',
    slug: 'modern-ofis-tasarimi',
    categoryIds: [4],

    description:
      'Ofis terasında açıklığı ayarlanabilen dikey hareketli giyotin cam sistemi için hazırlanan örnek tasarım ve 3D görselleştirme çalışması.',

    location: 'Ankara',
    year: 2026,
    status: 'design',

    image: project3,

    gallery: [project3],

    applicationImages: [],

    videoUrl: '',
  },
]
