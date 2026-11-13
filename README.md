# ♟ Xadrucas · Arena dos Mestres

MVP **v0.2** de xadrez de arena 2D, pensado para duas pessoas.

## Jogar

Após ativar o GitHub Pages, acesse:

**https://tombemol.github.io/Xadrucas/**

### Mesmo computador
Escolha os mestres, o cenário inicial, o tempo e clique **Iniciar duelo local**.

### Em computadores diferentes (experimental)
1. Abra a página e selecione **Com amigo online**.
2. O anfitrião escolhe o personagem e clica **Criar sala**.
3. Clique **Copiar link para Lucas** e envie o convite.
4. O segundo jogador abre o link, escolhe personagem e clica **Entrar na sala**.
5. Mantenham as duas abas abertas durante a partida. Não há contas ou persistência de sala.

O GitHub Pages hospeda apenas arquivos estáticos. Para a conexão P2P (WebRTC), esta versão usa **PeerJS 1.5.5** e o servidor público gratuito de sinalização do PeerJS. Isso não é um servidor nosso nem oferece disponibilidade garantida; determinadas redes/NATs podem impedir conexão direta. Os lances são validados no navegador do anfitrião, que é autoritativo dentro da sala, portanto **não há proteção contra trapaças do anfitrião**. O modo local funciona sem PeerJS, porém a biblioteca de xadrez é carregada via CDN e exige internet.

## Regras
- Quatro cenários espelhados: Duelo dos Reis, Fortaleza, Conselho Arcano, Guerra Relâmpago.
- 1, 3, 5 ou 10 minutos por jogador.
- Motor de regras **chess.js**, com movimentação legal, xeque, xeque-mate, roque, promoção, en passant, repetição e empate.
- Quatro mestres: Einstein (+10s), Turing (casas ameaçadas), Franklin (peças adversárias vulneráveis), Capablanca (suas peças sob ameaça).
- Cada habilidade é usada uma única vez por partida na própria vez. As habilidades têm balanceamento **experimental**.
- Partidas online geram código temporário; revanche depende de ambos aceitarem.

## Implantação no GitHub Pages
O repositório contém o site estático na raiz e um workflow de implantação automática. Para habilitar **uma única vez**:
1. Acesse **Settings → Pages**.
2. Em **Build and deployment → Source**, selecione **GitHub Actions**.
3. Acompanhe **Actions → Publicar Xadrucas**. Se a primeira execução falhou antes de habilitar o Pages, clique em **Re-run jobs**.
4. Quando o deploy ficar verde, abra https://tombemol.github.io/Xadrucas/.

## Arquivos
- `index.html`: estrutura da interface.
- `style.css`: tema e efeitos 2D.
- `app.js`: interface, regras de poderes, temporizadores, sincronização P2P.
- `.github/workflows/pages.yml`: publicação do GitHub Pages a cada push na `main`.

## Dependências e atribuições
- [chess.js 1.4.0](https://github.com/jhlywa/chess.js), BSD-2-Clause.
- [PeerJS 1.5.5](https://github.com/peers/peerjs), MIT. Servidor de sinalização gratuito, sem SLA.
- GitHub Pages e GitHub Actions.
- As figuras históricas são representadas por símbolos Unicode, sem usar retratos de terceiros.

## Limitações
- A versão estática não implementa o servidor Node original do MVP anterior.
- O tempo é controlado pelo navegador anfitrião e a conexão desconectada pode encerrar o duelo.
- Atualizar a página perde a sessão online.
- Sem conta, pareamento público, ranking, reconexão automática ou anti-cheat.
- Não houve teste ponta a ponta validado em dois navegadores físicos nesta entrega.

Projeto pessoal, protótipo.