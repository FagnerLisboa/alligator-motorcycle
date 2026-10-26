# 🐊 Jacaré Moto Radical

Jogo arcade feito com HTML, CSS e JavaScript puro, pronto para publicar no Vercel ou GitHub Pages.

## Estrutura

```text
jacare-moto-radical/
├── index.html              # Estrutura da página e HUD
├── css/
│   └── style.css           # Layout, cores, responsividade e botões
├── js/
│   └── game.js             # Loop do jogo, controles, colisões, moedas e sons
├── assets/
│   ├── moto-original.png   # Sprite principal da moto-jacaré com os pilotos
│   └── jacare-piloto-garupa.png
└── README.md
```

## Como executar

Abra `index.html` no navegador. Para uma experiência local mais confiável, use a extensão **Live Server** do VS Code.

## Controles

- Teclado: `←` / `→` ou `A` / `D`
- Celular: botões na parte inferior
- Botão de som: ativa/desativa os efeitos de áudio

## Regras do projeto

- Mantenha `index.html` na raiz, pois o Vercel publica a pasta raiz por padrão.
- Se mover ou renomear imagens, atualize os caminhos em `js/game.js`.
- O áudio é sintetizado com Web Audio API; não precisa de arquivos de som externos.
- O recorde é salvo no armazenamento local do navegador quando disponível.
