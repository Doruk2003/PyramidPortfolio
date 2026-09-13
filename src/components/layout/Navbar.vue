<template>
  <header class="navbar">
    <div class="navbar-container">
      <RouterLink to="/" class="brand"> Pyramid 3D</RouterLink>

      <nav class="nav-links">
        <RouterLink to="/">Ana Sayfa</RouterLink>
        <RouterLink to="/projeler">Projeler</RouterLink>
        <RouterLink to="/animasyonlar">Animasyonlar</RouterLink>
        <RouterLink to="/referanslar">Referanslar</RouterLink>
        <RouterLink to="/hakkimizda">Hakkımızda</RouterLink>
        <RouterLink to="/iletisim">İletişim</RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  width: 100%;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background);
}

.navbar-container {
  max-width: var(--container-width);
  margin: 0 auto;
  padding: 20px var(--page-padding);

  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  color: var(--color-text);
  font-size: 20px;
  font-weight: 700;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 24px;
}

.nav-links a {
  color: #333333;
  text-decoration: none;
  font-size: 15px;
}

.nav-links a:hover {
  color: #000000;
}

.nav-links a.router-link-active {
  font-weight: 700;
}

@media (max-width: 900px) {
  .navbar-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }

  .nav-links {
    flex-wrap: wrap;
    gap: 16px 24px;
  }
}
</style>
