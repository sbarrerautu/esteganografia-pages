(() => {
  const storageKey = 'ciberobservatorio-theme';
  const root = document.documentElement;
  let theme = 'light';

  try {
    if (localStorage.getItem(storageKey) === 'dark') theme = 'dark';
  } catch {
    // La elección sigue funcionando si el navegador bloquea el almacenamiento.
  }
  root.dataset.theme = theme;

  document.addEventListener('DOMContentLoaded', () => {
    const button = document.querySelector('#theme-toggle');
    const label = button.querySelector('[data-theme-label]');
    const icon = button.querySelector('[data-theme-icon]');

    function updateButton() {
      const dark = root.dataset.theme === 'dark';
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
      label.textContent = dark ? 'Modo claro' : 'Modo oscuro';
      icon.textContent = dark ? '☀️' : '🌙';
      button.hidden = false;
    }

    button.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(storageKey, root.dataset.theme);
      } catch {
        // Algunos modos privados permiten cambiar el tema solo en esta visita.
      }
      updateButton();
    });

    updateButton();
  });
})();
