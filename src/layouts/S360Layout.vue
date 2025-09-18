<template>
  <el-container class="s360-layout">
    <!-- ЛЕВАЯ КОЛОНКА -->
    <el-aside width="240px" class="s360-aside">
      <div class="s360-logo">Service360</div>

      <nav class="s360-nav">
        <router-link to="/" class="nav-item">Главная</router-link>
        <router-link to="/nsi/object-types" class="nav-item">Типы объектов</router-link>
        <router-link to="/nsi/components" class="nav-item">Компоненты</router-link>
        <!-- добавляй пункты по мере роста проекта -->
      </nav>
    </el-aside>

    <!-- ПРАВАЯ КОЛОНКА -->
    <el-container>
      <el-main class="s360-main">
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
// без логики — это «каркас»
</script>

<style scoped>
.s360-layout {
  height: 100vh;
  width: 100vw;
  display: flex;
  overflow: hidden; /* убираем горизонтальный скролл у каркаса */
}

/* левая колонка */
.s360-aside {
  flex: 0 0 240px;
  width: 240px;
  min-height: 100vh;
  box-sizing: border-box;
  padding: 16px 12px;
  background: #f7fbfb;
  border-right: 1px solid #e6eaea;
}

/* логотип/заголовок слева */
.s360-logo {
  font-weight: 700;
  font-size: 18px;
  color: #006d77;
  margin: 4px 8px 16px;
}

/* вертикальная навигация */
.s360-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-item {
  display: block;
  padding: 10px 12px;
  border-radius: 8px;
  color: #0f3e44;
  text-decoration: none;
}

/* hover + активная ссылка (router добавляет .router-link-active) */
.nav-item:hover,
.router-link-active.nav-item {
  background: #e6f2f2; /* светлый морской */
  color: #006d77;
  font-weight: 600;
}

/* правая колонка (контент) */
.s360-main {
  flex: 1 1 auto;
  min-width: 0;
  width: auto;
  max-width: none;
  padding: 24px 28px;
  background: #fff;
  overflow: auto; /* скролл только внутри контента при необходимости */
}

/* таблица пусть занимает всю доступную ширину */
.s360-main .el-table {
  width: 100%;
}
</style>
