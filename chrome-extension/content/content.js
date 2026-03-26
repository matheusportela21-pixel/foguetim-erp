(function () {
  'use strict';

  // ─── Marketplace Detection ───────────────────────────────────────────

  function detectMarketplace() {
    const host = window.location.hostname;
    if (host.includes('mercadolivre.com.br')) return 'mercadolivre';
    if (host.includes('shopee.com.br')) return 'shopee';
    if (host.includes('magazineluiza.com.br') || host.includes('magalu.com.br')) return 'magalu';
    if (host.includes('amazon.com.br')) return 'amazon';
    if (host.includes('aliexpress.com')) return 'aliexpress';
    if (host.includes('shein.com')) return 'shein';
    if (host.includes('americanas.com.br')) return 'americanas';
    if (host.includes('kabum.com.br')) return 'kabum';
    return null;
  }

  // ─── Product Page Detection ──────────────────────────────────────────

  function isProductPage(marketplace) {
    const path = window.location.pathname;
    const url = window.location.href;
    switch (marketplace) {
      case 'mercadolivre':
        return path.includes('/p/MLB') || /MLB-?\d+/.test(url);
      case 'shopee':
        return /\/\d+\/\d+/.test(path) || path.includes('-i.');
      case 'magalu':
        return path.includes('/p/') && path.split('/').length >= 3;
      case 'amazon':
        return path.includes('/dp/') || path.includes('/gp/product/');
      case 'aliexpress':
        return path.includes('/item/') || path.includes('/i/');
      case 'shein':
        return path.includes('-p-') || /\d+\.html/.test(path);
      case 'americanas':
        return path.includes('/produto/');
      case 'kabum':
        return path.includes('/produto/');
      default:
        return false;
    }
  }

  // ─── Extractors ──────────────────────────────────────────────────────

  function extractFromML() {
    const title =
      document.querySelector('h1.ui-pdp-title')?.textContent?.trim() ||
      document.querySelector('[class*="title"]')?.textContent?.trim() ||
      '';

    const priceFraction =
      document.querySelector('.andes-money-amount__fraction')?.textContent || '';
    const priceCents =
      document.querySelector('.andes-money-amount__cents')?.textContent || '';
    const price =
      parseFloat(
        priceFraction.replace(/\./g, '') +
          (priceCents ? '.' + priceCents : '')
      ) || 0;

    const originalPriceEl = document.querySelector(
      '.ui-pdp-price__second-line .andes-money-amount__fraction'
    );
    const originalPrice = originalPriceEl
      ? parseFloat(originalPriceEl.textContent.replace(/\./g, ''))
      : null;

    const images = Array.from(
      document.querySelectorAll('.ui-pdp-gallery__figure img, [data-zoom]')
    )
      .map(
        (img) =>
          img.getAttribute('data-zoom') ||
          img.getAttribute('data-src') ||
          img.src
      )
      .filter(
        (src) =>
          src && !src.includes('placeholder') && src.startsWith('http')
      )
      .map((src) => src.replace(/-[A-Z]\.jpg/, '-O.jpg'));

    const attributes = {};
    document
      .querySelectorAll('.ui-pdp-specs__table tr, .andes-table__row')
      .forEach((row) => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length >= 2) {
          attributes[cells[0].textContent.trim()] =
            cells[1].textContent.trim();
        }
      });

    const brand =
      attributes['Marca'] ||
      document.querySelector('[class*="brand"]')?.textContent?.trim() ||
      '';
    const sku = attributes['SKU'] || attributes['Modelo'] || '';
    const ean = attributes['EAN'] || attributes['GTIN'] || '';
    const condition = document
      .querySelector('.ui-pdp-subtitle')
      ?.textContent?.includes('Novo')
      ? 'new'
      : 'used';

    return {
      title,
      price,
      original_price: originalPrice,
      images,
      brand,
      sku,
      ean,
      condition,
      attributes,
      currency: 'BRL',
    };
  }

  function extractFromShopee() {
    const title =
      document.querySelector(
        '._2rQP1z, [class*="product-title"], div.HLQqkk span'
      )?.textContent?.trim() ||
      document.querySelector('meta[property="og:title"]')?.content ||
      '';

    const priceText =
      document.querySelector('.pqTWkA, [class*="price-tag"], .k9JZlv')
        ?.textContent || '';
    const price =
      parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

    const images = Array.from(
      document.querySelectorAll(
        '.ZPN9uB img, [class*="product-image"] img, ._2GchKS img'
      )
    )
      .map((img) => (img.src || '').replace(/_tn$/, ''))
      .filter((src) => src && src.startsWith('http'));

    const description =
      document.querySelector('._2u0jt9, [class*="product-detail"]')
        ?.textContent?.trim() || '';

    return { title, price, images, description, currency: 'BRL' };
  }

  function extractFromMagalu() {
    const title =
      document.querySelector(
        'h1[data-testid="heading-product-title"], h1'
      )?.textContent?.trim() ||
      document.querySelector('meta[property="og:title"]')?.content ||
      '';

    const priceText =
      document.querySelector('[data-testid="price-value"], [class*="price"]')
        ?.textContent || '';
    const price =
      parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

    const images = Array.from(
      document.querySelectorAll(
        '[data-testid*="image"] img, .product-image img'
      )
    )
      .map((img) => img.src)
      .filter((src) => src && src.startsWith('http'));
    if (!images.length) {
      const ogImage = document.querySelector(
        'meta[property="og:image"]'
      )?.content;
      if (ogImage) images.push(ogImage);
    }

    const description =
      document.querySelector(
        '[data-testid="rich-content"], [class*="description"]'
      )?.textContent?.trim() || '';

    return { title, price, images, description, currency: 'BRL' };
  }

  function extractFromAmazon() {
    const title =
      document.getElementById('productTitle')?.textContent?.trim() || '';

    const priceText =
      document.querySelector('.a-price .a-offscreen')?.textContent ||
      document.getElementById('priceblock_ourprice')?.textContent ||
      '';
    const price =
      parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

    const images = [];
    const imgData = document.querySelectorAll(
      '#altImages .a-button-thumbnail img, #imageBlock img'
    );
    imgData.forEach((img) => {
      let src = img.src || '';
      src = src
        .replace(/\._[A-Z]+\d+_/, '')
        .replace(/\._(SL|SX|SY)\d+_/, '');
      if (
        src &&
        src.startsWith('http') &&
        !src.includes('pixel') &&
        !src.includes('spacer')
      ) {
        images.push(src);
      }
    });

    const brand =
      document
        .getElementById('bylineInfo')
        ?.textContent?.replace('Visite a loja ', '')
        .replace('Marca: ', '')
        .trim() || '';
    const description =
      document.getElementById('productDescription')?.textContent?.trim() ||
      document.getElementById('feature-bullets')?.textContent?.trim() ||
      '';

    return { title, price, images, brand, description, currency: 'BRL' };
  }

  function extractGeneric() {
    const getMeta = (prop) =>
      document.querySelector(
        `meta[property="${prop}"], meta[name="${prop}"]`
      )?.content || '';
    return {
      title: getMeta('og:title') || document.title || '',
      price: parseFloat(getMeta('product:price:amount')) || 0,
      images: [getMeta('og:image')].filter(Boolean),
      description:
        getMeta('og:description') || getMeta('description') || '',
      currency: getMeta('product:price:currency') || 'BRL',
    };
  }

  function extractProductData(marketplace) {
    switch (marketplace) {
      case 'mercadolivre':
        return extractFromML();
      case 'shopee':
        return extractFromShopee();
      case 'magalu':
        return extractFromMagalu();
      case 'amazon':
        return extractFromAmazon();
      case 'aliexpress':
        return extractGeneric();
      case 'shein':
        return extractGeneric();
      case 'americanas':
        return extractGeneric();
      case 'kabum':
        return extractGeneric();
      default:
        return extractGeneric();
    }
  }

  // ─── Toast Helper ────────────────────────────────────────────────────

  function showToast(message, type = 'success') {
    const existing = document.getElementById('foguetim-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'foguetim-toast';
    toast.className = `foguetim-toast foguetim-toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('foguetim-toast--hide');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ─── Token Helper ──────────────────────────────────────────────────

  function getStoredToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['foguetim_token'], (result) => {
        resolve(result.foguetim_token || null);
      });
    });
  }

  // ─── API Call ────────────────────────────────────────────────────────

  async function sendToFoguetim(data, marketplace) {
    const token = await getStoredToken();

    if (!token) {
      showToast(
        'Voce precisa fazer login na extensao Foguetim primeiro.',
        'warning'
      );
      chrome.runtime.sendMessage({ action: 'openPopup' });
      return;
    }

    const payload = {
      ...data,
      source_marketplace: marketplace,
      source_url: window.location.href,
      extracted_at: new Date().toISOString(),
    };

    try {
      const response = await fetch(
        'https://app.foguetim.com.br/api/listings/extract-chrome',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        const result = await response.json();
        showToast(
          `Anuncio copiado com sucesso! ${result.id ? '(#' + result.id + ')' : ''}`,
          'success'
        );
      } else if (response.status === 401) {
        showToast('Sessao expirada. Faca login novamente.', 'error');
        chrome.storage.local.remove(['foguetim_token', 'foguetim_user']);
        chrome.runtime.sendMessage({ action: 'openPopup' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(
          errorData.message || 'Erro ao copiar anuncio. Tente novamente.',
          'error'
        );
      }
    } catch (err) {
      showToast('Erro de conexao. Verifique sua internet.', 'error');
      console.error('[Foguetim]', err);
    }
  }

  // ─── Button Injection ───────────────────────────────────────────────

  function injectButton(marketplace) {
    if (document.getElementById('foguetim-copy-btn')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'foguetim-copy-btn';
    wrapper.className = 'foguetim-btn-wrapper';
    wrapper.innerHTML = `
      <button class="foguetim-btn" title="Copiar anuncio para o Foguetim ERP">
        <svg class="foguetim-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span class="foguetim-btn-text">Copiar pro Foguetim</span>
      </button>
    `;

    document.body.appendChild(wrapper);

    const btn = wrapper.querySelector('.foguetim-btn');

    btn.addEventListener('click', async () => {
      btn.classList.add('foguetim-btn--loading');
      btn.querySelector('.foguetim-btn-text').textContent = 'Extraindo...';

      try {
        const data = extractProductData(marketplace);

        if (!data.title) {
          showToast(
            'Nao foi possivel extrair os dados. A pagina carregou completamente?',
            'warning'
          );
          return;
        }

        btn.querySelector('.foguetim-btn-text').textContent = 'Enviando...';
        await sendToFoguetim(data, marketplace);
      } catch (err) {
        showToast('Erro ao extrair dados do anuncio.', 'error');
        console.error('[Foguetim]', err);
      } finally {
        btn.classList.remove('foguetim-btn--loading');
        btn.querySelector('.foguetim-btn-text').textContent =
          'Copiar pro Foguetim';
      }
    });
  }

  // ─── Init ────────────────────────────────────────────────────────────

  function init() {
    const marketplace = detectMarketplace();
    if (!marketplace) return;
    if (!isProductPage(marketplace)) return;

    // Wait for page to be reasonably loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () =>
        injectButton(marketplace)
      );
    } else {
      // Small delay to let SPAs render
      setTimeout(() => injectButton(marketplace), 1500);
    }
  }

  init();

  // Re-check on URL changes (SPA navigation)
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      const existing = document.getElementById('foguetim-copy-btn');
      if (existing) existing.remove();
      const existingToast = document.getElementById('foguetim-toast');
      if (existingToast) existingToast.remove();
      setTimeout(init, 1500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
