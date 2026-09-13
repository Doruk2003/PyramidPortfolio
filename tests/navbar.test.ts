import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import Navbar from '../src/components/layout/Navbar.vue'

describe('Public navigation selection', () => {
  it('marks only the current section, including project details and browser back navigation', async () => {
    const component = { template: '<div />' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component,
          children: [
            '',
            'projeler',
            'projeler/:slug',
            'animasyonlar',
            'referanslar',
            'hakkimizda',
            'iletisim',
          ].map((path) => ({ path, component })),
        },
      ],
    })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(Navbar, { global: { plugins: [router] } })
    for (const [path, expected] of [
      ['/', 'Ana Sayfa'],
      ['/projeler', 'Projeler'],
      ['/projeler/ornek?tab=video', 'Projeler'],
      ['/iletisim', 'İletişim'],
      ['/hakkimizda/', 'Hakkımızda'],
    ]) {
      await router.push(path!)
      await flushPromises()
      const active = wrapper.findAll('nav a.is-current')
      expect(active).toHaveLength(1)
      expect(active[0]!.text()).toBe(expected)
      expect(wrapper.findAll('nav a[aria-current]')).toHaveLength(1)
    }
    router.back()
    await flushPromises()
    expect(wrapper.get('nav a.is-current').text()).toBe('İletişim')
  })
})
