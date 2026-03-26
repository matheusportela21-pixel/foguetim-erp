# Foguetim ERP - Extensao Chrome

Copie anuncios de qualquer marketplace para o Foguetim ERP com um clique.

## Marketplaces Suportados

- Mercado Livre
- Shopee
- Magazine Luiza
- Amazon Brasil
- AliExpress
- Shein
- Americanas
- KaBuM

## Instalacao (Modo Desenvolvedor)

1. Abra o Chrome e acesse `chrome://extensions/`
2. Ative o **Modo do desenvolvedor** (canto superior direito)
3. Clique em **Carregar sem compactacao**
4. Selecione a pasta `chrome-extension/`
5. A extensao aparecera na barra de extensoes do Chrome

## Como Usar

1. Clique no icone da extensao e faca login com sua conta Foguetim ERP
2. Navegue ate a pagina de um produto em qualquer marketplace suportado
3. Clique no botao roxo **"Copiar pro Foguetim"** que aparece no canto inferior direito
4. O anuncio sera copiado como rascunho no Foguetim ERP
5. Acesse seus rascunhos em **app.foguetim.com.br/rascunhos**

## Estrutura

```
chrome-extension/
  manifest.json          - Configuracao da extensao (Manifest V3)
  popup/
    popup.html           - Interface do popup (login/status)
    popup.js             - Logica do popup
  content/
    content.js           - Script injetado nas paginas (extracao de dados)
  background/
    background.js        - Service worker (mensagens, instalacao)
  styles/
    button.css           - Estilos do botao flutuante e toasts
  icons/                 - Icones da extensao (16, 32, 48, 128px)
```

## Futuro

- Publicacao na Chrome Web Store
- Suporte a mais marketplaces
- Edicao de dados antes de enviar
- Historico de copias
