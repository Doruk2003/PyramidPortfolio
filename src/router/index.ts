import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { installAuthGuard } from './authGuard'

import PublicLayout from '../layouts/PublicLayout.vue'
import AdminLayout from '../layouts/AdminLayout.vue'

import HomeView from '../views/HomeView.vue'
import ProjectsView from '../views/ProjectsView.vue'
import ProjectDetailView from '../views/ProjectDetailView.vue'
import AnimationsView from '../views/AnimationsView.vue'
import ReferencesView from '../views/ReferencesView.vue'
import AboutView from '../views/AboutView.vue'
import ContactView from '../views/ContactView.vue'

import DashboardView from '../views/admin/DashboardView.vue'
import ProjectsAdminView from '../views/admin/ProjectsAdminView.vue'
import NewProjectView from '../views/admin/NewProjectView.vue'
import CategoriesAdminView from '../views/admin/CategoriesAdminView.vue'
import MediaAdminView from '../views/admin/MediaAdminView.vue'
import AdminLoginView from '../views/auth/AdminLoginView.vue'

const router = createRouter({
  history: createWebHistory(),

  routes: [
    {
      path: '/admin/login',
      name: 'admin-login',
      component: AdminLoginView,
    },
    {
      path: '/',
      component: PublicLayout,

      children: [
        {
          path: '',
          name: 'home',
          component: HomeView,
        },
        {
          path: 'projeler',
          name: 'projects',
          component: ProjectsView,
        },
        {
          path: 'projeler/:slug',
          name: 'project-detail',
          component: ProjectDetailView,
        },
        {
          path: 'animasyonlar',
          name: 'animations',
          component: AnimationsView,
        },
        {
          path: 'referanslar',
          name: 'references',
          component: ReferencesView,
        },
        {
          path: 'hakkimizda',
          name: 'about',
          component: AboutView,
        },
        {
          path: 'iletisim',
          name: 'contact',
          component: ContactView,
        },
      ],
    },

    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true },

      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: DashboardView,
        },
        {
          path: 'projeler',
          name: 'admin-projects',
          component: ProjectsAdminView,
        },
        { path: 'projeler/:id/duzenle', name: 'admin-project-edit', component: NewProjectView },
        { path: 'kategoriler', name: 'admin-categories', component: CategoriesAdminView },
        { path: 'medya', name: 'admin-media', component: MediaAdminView },
        {
          path: 'projeler/yeni',
          name: 'admin-project-new',
          component: NewProjectView,
        },
      ],
    },
  ],
})

const disposeAuthGuard = installAuthGuard(router, useAuth())

if (import.meta.hot) {
  import.meta.hot.dispose(disposeAuthGuard)
}

export default router
