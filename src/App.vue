<template>
  <RouterView />
</template>

<script setup>
</script>

<style>
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  background: var(--surface-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  -webkit-font-smoothing: antialiased;
}

#app {
  height: 100vh;
  overflow: hidden;
}
</style>
