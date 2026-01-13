# RECSHOP • React

Este projeto React (Vite) carrega a sua página original `Rec31.html` dentro de um iframe para manter todas as funcionalidades imediatamente, permitindo migrar gradualmente para componentes React.

## Como usar

1) Mova o seu arquivo original para:

```
react-recshop/public/Rec31.html
```

2) Instale e rode:

```
npm install
npm run dev
```

3) Abra o navegador no endereço indicado pelo Vite (por padrão `http://localhost:5173`).

Se o arquivo não for encontrado, a tela exibirá um aviso. Assim que você colocar o `Rec31.html` na pasta `public/`, recarregue a página.

## Próximos passos (migração gradual)

- Extrair trechos do `Rec31.html` para componentes React (`src/components/...`).
- Substituir `onclick="..."` por `onClick={...}` com estados/hooks.
- Mover scripts inline para módulos JS/TS reutilizáveis.


