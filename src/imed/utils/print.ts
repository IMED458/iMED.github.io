// ============================================================
// iMED — საიმედო ბეჭდვა (visibility-based, iframe-ის გარეშე)
// ============================================================

/**
 * ბეჭდავს მითითებულ DOM ელემენტს — დანარჩენი გვერდი იმალება.
 * მუშაობს modal-ებზე, off-screen წყაროებზე და ჩვეულებრივ ბლოკებზე.
 */
export function printElement(el: HTMLElement | null | undefined) {
  if (!el) {
    alert('ბეჭდვა ვერ მოხერხდა — დოკუმენტი ვერ მოიძებნა.');
    return;
  }

  el.classList.add('imed-printing');

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    el.classList.remove('imed-printing');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  // მცირე დაყოვნება — DOM-ის გადახატვისთვის
  setTimeout(() => {
    try {
      window.print();
    } catch {
      /* ignore */
    } finally {
      // fallback — თუ afterprint არ ჩაირთო
      setTimeout(cleanup, 800);
    }
  }, 60);
}
