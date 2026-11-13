# Xadrucas: Arena dos Impossíveis · v0.3 Playtest

O xadrez define *quem pode desafiar quem*. A captura só acontece depois de um **combate 2D controlado pelos jogadores**. Esta versão substitui o MVP de poderes visuais do tabuleiro por uma arena com regras próprias.

**Jogar:** https://tombemol.github.io/Xadrucas/

## Como jogar

1. Escolha **Duelo local** (mesmo teclado), **Online** (dois navegadores) ou **Campanha** (contra IA básica).
2. Faça movimentos legais no tabuleiro. Ao selecionar uma captura, o jogo pausa o relógio e abre uma arena 2D.
3. O vencedor da luta decide a captura. Se o atacante ganhar, captura normalmente. Se o defensor ganhar, o atacante escolhe:
   - **Recuar:** mantém a peça onde estava, mas perde a vez.
   - **Tudo ou nada:** enfrenta outra luta. Se perder, perde a própria peça atacante. Se vencer, captura a defensora.
4. A assistência histórica é utilizável **uma vez por luta**. O dano, a distância e a velocidade dependem do tipo da peça.

### Controles na luta

| Ação | Brancas locais | Pretas locais | Online / campanha |
|---|---|---|---|
| Andar | A / D | ← / → | A / D |
| Pular | W | ↑ | W |
| Ataque leve | F | J | F |
| Especial / pesado | G | K | G |
| Assistência | H | L | H |
| Defender | S | ↓ | S |

Em dispositivos móveis há botões de toque para o jogador local, para o modo online e para a campanha. No duelo local com dois humanos, um **teclado físico** é recomendado.

### Classes

- Peão: **Vanguarda**, rápido e com golpes curtos.
- Cavalo: **Cavaleiro**, ágil e com alcance maior.
- Bispo: **Arcano**, conjura projéteis no especial.
- Torre: **Bastião**, tanque resistente e lento.
- Dama: **Imperatriz**, versátil e com magia.
- Rei: **Soberano**, equilibrado, com golpe pesado.

### Arenas cíclicas

Os confrontos alternam entre **Briga de Rua** (combate clássico), **Ritual Arcano** (especiais à distância) e **Tempestade de Tesla** (perigo elétrico no centro). Todas ainda pertencem à família de minijogos de luta 2D; corridas, jogos de ritmo e outros gêneros **ainda não foram feitos**.

### Assistências históricas

- **Einstein**: onda gravitacional que empurra e atordoa, uma licença criativa inspirada na relatividade.
- **Tesla**: descarga elétrica que causa dano e atordoa.
- **Alan Turing**: algoritmo de cura.
- **Capablanca**: contra-ataque que cura e atordoa.
- **Ada Lovelace**: ataque bônus de combo.

Estas são representações ficcionais, não descrições literais das contribuições históricas.

## Campanha

Três capítulos com IA simples. Cada vitória dá 100 XP; desbloqueios visuais são registrados localmente pelo navegador. XP **não aumenta dano, vida ou velocidade em PvP**. O progresso fica no `localStorage` do navegador e não é salvo na nuvem.

## Multiplayer e limitações

O modo online usa **PeerJS 1.5.5 + WebRTC**. O anfitrião simula o combate e valida jogadas; o convidado envia comandos e recebe snapshots. Ambos precisam de uma conexão estável e devem manter a página aberta. O serviço gratuito de sinalização depende de terceiros, e algumas redes bloqueiam WebRTC. Não há reconexão automática, contas, anti-cheat ou matchmaking. Os controles P2P de combate ainda **precisam de teste prático em duas redes**; latência pode atrapalhar.

**Importante:** a modalidade é uma variante híbrida de xadrez. Recuar após um combate *passa a vez*, e perder a revanche pode remover a peça atacando sem uma captura tradicional. Portanto, não é xadrez competitivo padrão. Xeque, movimentos legais, roque e promoção são validados por `chess.js` no tabuleiro, mas as mudanças especiais podem afetar histórico/castling/draws.

## Executar localmente

Requer Node.js 20+ apenas para o servidor de arquivos, sem instalação de bibliotecas:

```bash
npm run dev
```

Abra http://localhost:3000. Bibliotecas `chess.js` e PeerJS vêm de CDN quando houver conexão com a internet. Para verificar o motor de combate:

```bash
npm test
```

## Implantação

Site estático preparado para GitHub Pages. O workflow `.github/workflows/pages.yml` já existente na branch `main` publica automaticamente a raiz quando recebe um push.

## Estrutura

- `index.html`: interface do jogo, tela de preparação, overlay da luta.
- `style.css`: design e acessibilidade básica, layout responsivo.
- `app.js`: regras de fluxo, tabuleiro, campanha, rede P2P, canvas 2D e controles.
- `combat.mjs`: simulação do combate isolada, sem dependências externas.
- `tests/combat.test.mjs`: testes automatizados do núcleo.
- `server.mjs`: servidor HTTP local com Node sem dependências.

## Validação desta versão

O motor de combate passou **10 testes automatizados** em Node.js. JavaScript passou por checagem de sintaxe. Ainda não houve verificação ponta a ponta real em dois computadores e o navegador automatizado local deste ambiente bloqueou navegação por política, portanto a interface deve ser tratada como **playtest**.

### Créditos e licenças

`chess.js` BSD-2-Clause, `PeerJS` MIT. Figuras desenhadas diretamente no Canvas com formas vetoriais; sem imagens/sprites de Dragon Ball FighterZ, Super Smash Bros ou outros jogos protegidos.
