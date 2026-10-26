# Jacaré Moto Radical 🐊🏍️

Jogo arcade em HTML, CSS e JavaScript com a arte original da moto, obstáculos, moedas, pontuação, sons, animação e loja.

## Loja
- Rastros: Radical (grátis), Dourado (20 moedas) e Neon (50 moedas).
- Acabamentos da moto: Clássico (grátis), Solar (75 moedas) e Glacial (100 moedas).
- As moedas, compras e escolhas ficam salvas no navegador.
- A arte original da moto é preservada; os modelos extras aplicam uma tonalidade suave sobre ela.

## Como jogar
- Abra `index.html` no navegador ou publique o projeto no Vercel.
- Use ← → ou A / D para desviar.
- No celular, use os botões ou toque nos lados da pista.
- Colete moedas e abra a **LOJA** para personalizar.

## Estrutura
- `index.html`: estrutura do jogo e da loja.
- `css/style.css`: visual responsivo.
- `js/game.js`: lógica da corrida, moedas, sons e loja.
- `assets/`: imagens do projeto.


## Sistema de vidas
- Cada corrida começa com 3 vidas.
- Colisões com obstáculos removem uma vida.
- Após uma colisão, há um curto período de proteção para evitar perder várias vidas instantaneamente.
- A corrida termina quando as 3 vidas acabam.


## Habilidades
- Colete 3 frutinhas que aparecem na pista.
- Quando o contador chegar a 3/3, o botão de habilidade fica disponível.
- Ative a habilidade para ganhar um escudo de 4,5 segundos contra colisões.
- As frutinhas são geradas durante a corrida.


## Três habilidades
Colete 3 frutinhas para escolher um poder (cada poder dura 5 segundos):
- 🛡️ Escudo: impede perder vidas por colisões.
- ⚡ Supervelocidade: aumenta a velocidade e multiplica a pontuação temporariamente.
- 🧲 Ímã: atrai moedas próximas para o jogador.


## Versão 8 — animações das habilidades
- Escudo: bolha energética pulsante com arcos animados.
- Supervelocidade: labaredas animadas junto às rodas.
- Ímã: ondas magnéticas giratórias e polos N/S.
- Indicador no HUD informa qual habilidade está ativa.


## Versão 9 — transformação visual
Ao ativar uma habilidade, a moto ganha efeitos de transformação:
- Escudo: runas de energia orbitam o personagem.
- Supervelocidade: raios e faíscas acompanham a moto.
- Ímã: faíscas magnéticas giram ao redor do personagem.
O indicador da interface anuncia a transformação ativa.


## Versão 10 — música arcade
- Adiciona música de fundo animada, estilo jogo arcade, sintetizada pelo navegador.
- Botão separado para ligar/desligar a música.
- Efeitos sonoros continuam com controle independente.
- Não precisa baixar MP3 nem usar serviço externo; o áudio começa após clicar para iniciar a corrida.
