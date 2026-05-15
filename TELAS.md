# 🎨 Screenshots e Descrição das Telas

## 1. Tela de Login

### Layout
```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│                                                               │
│                  ┌──────────────────────┐                    │
│                  │                      │                    │
│                  │  Serial Reader       │                    │
│                  │                      │                    │
│                  │ Acesse com suas      │                    │
│                  │ credenciais          │                    │
│                  │                      │                    │
│                  │ Usuário              │                    │
│                  │ ┌──────────────────┐ │                    │
│                  │ │ admin            │ │                    │
│                  │ └──────────────────┘ │                    │
│                  │                      │                    │
│                  │ Senha                │                    │
│                  │ ┌──────────────────┐ │                    │
│                  │ │ ••••••           │ │                    │
│                  │ └──────────────────┘ │                    │
│                  │                      │                    │
│                  │  [  ENTRAR  ]        │                    │
│                  │                      │                    │
│                  └──────────────────────┘                    │
│                                                               │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Características:
- **Fundo:** Cinzento claro (#F3F4F6)
- **Card:** Branco com sombra suave, 360px de largura
- **Fonte:** Segoe UI, Inter, Roboto (system font)
- **Espaçamento:** Generoso (36px padding no card)
- **Título:** 22px, azul escuro (#1E3A8A)
- **Subtítulo:** 13px, cinza (#6B7280)
- **Inputs:** Borda cinza, 10px padding, hover/focus em azul
- **Botão:** Azul cheio, 100% da largura, desabilitado ao enviar

### Fluxo:
1. Usuário digita **admin** no campo "Usuário"
2. Usuário digita **admin** no campo "Senha"
3. Clica "Entrar"
4. Sistema valida credenciais via IPC (bcrypt)
5. ✅ Se válido → vai para Dashboard
6. ❌ Se inválido → mostra mensagem de erro em vermelho

### Validação:
- Campos obrigatórios
- Erro exibido acima do botão em **vermelho (#EF4444)**
- Botão fica desabilitado durante autenticação (texto muda para "Entrando...")

---

## 2. Dashboard de Lotes

### Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌─────────────────┐  ┌────────────────────────────────────────┐   │
│  │ Serial Reader   │  │ Dashboard        [+Nova Fórmula][+N.Lo│   │
│  │                 │  │                                        │   │
│  │ 📋 Dashboard    │  │ ┌──────────┐ ┌──────────┐ ┌────────┐ │   │
│  │                 │  │ │ Lote A01 │ │ Lote B02 │ │ Lote..│ │   │
│  │ 📑 Fórmulas     │  │ │ Fórmula: │ │ Fórmula: │ │       │ │   │
│  │                 │  │ │ XYZ-001  │ │ ABC-002  │ │       │ │   │
│  │ ⚙️ Config       │  │ │ [INICIAR]│ │ [INICIAR]│ │       │ │   │
│  │                 │  │ │ [FIM]    │ │ [FIM]    │ │       │ │   │
│  │ 🚪 Sair         │  │ └──────────┘ └──────────┘ └────────┘ │   │
│  │                 │  │                                        │   │
│  │ Usuário: admin  │  │ ┌──────────┐ ┌──────────┐ ┌────────┐ │   │
│  │ [SAIR]          │  │ │ Lote C03 │ │ Lote D04 │ │ Vazio  │ │   │
│  │                 │  │ │ Fórmula: │ │ Fórmula: │ │        │ │   │
│  │                 │  │ │ DEF-003  │ │ GHI-004  │ │        │ │   │
│  │                 │  │ │ [INICIAR]│ │ [INICIAR]│ │        │ │   │
│  │                 │  │ │ [FIM]    │ │ [FIM]    │ │        │ │   │
│  │                 │  │ └──────────┘ └──────────┘ └────────┘ │   │
│  │                 │  │                                        │   │
│  └─────────────────┘  └────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Características:
- **Sidebar:** Barra escura esquerda (220px, #0F172A)
  - Logo "Serial Reader" no topo
  - Menu navegação: Dashboard, Fórmulas, Config
  - Info do usuário + botão Sair
  
- **Topbar:** Barra branca com título e botões de ação
  - Título: "Dashboard"
  - Botões: "+ Nova Fórmula", "+ Novo Lote"

- **Grid de Lotes:** 3×2 cards (até 6 lotes abertos)
  - Cada card com: código, fórmula, botões [INICIAR] e [FIM]
  - Cards vazios quando slot não usado

### Cores:
- **Primário:** Azul #1E3A8A
- **Accent:** Verde #10B981 (botão "Iniciar Leitura")
- **Card:** Branco com borda cinza

---

## 3. Modal de Captura Ativa

### Layout (quando clica "INICIAR LEITURA")
```
┌────────────────────────────────────────┐
│  Captura Ativa - Lote A01              │ ✕
├────────────────────────────────────────┤
│                                        │
│        ⏱️ 00:28  [CANCELAR]           │
│           (circular countdown)         │
│                                        │
│  Equipamento 1      Equipamento 2      │
│  COM1 (9600)        COM2 (9600)        │
│  🟢 OK              🟡 Aguardando      │
│                                        │
│  Equipamento 3      Equipamento 4      │
│  COM3 (9600)        COM4 (9600)        │
│  🟢 OK              🔴 Falha            │
│                                        │
│  Equipamento 5      Equipamento 6      │
│  COM5 (9600)        (Reserva)         │
│  🟢 OK              ⚪ Desativado      │
│                                        │
├────────────────────────────────────────┤
│                       [FINALIZAR]      │
└────────────────────────────────────────┘
```

### Status dos LEDs:
- 🟢 **Verde**: Porta aberta, aguardando dados
- 🟡 **Amarelo**: Dados recebidos, processando
- 🔴 **Vermelho**: Falha ao abrir porta
- ⚪ **Cinza**: Porta desativada nas settings

### Comportamento:
- Abre as 6 portas seriais (5 + 1 reserva)
- Timeout configurável (default 30s)
- Operador vai em cada equipamento e aperta "PRINT"
- Captura múltiplas leituras por sessão
- Salva timestamp de cada leitura

---

## 4. Tela de Configurações

### Abas:

#### **Captura**
```
Timeout de Captura (segundos)
┌────────────────┐
│ 30             │  ← Configurável em DB (settings)
└────────────────┘
```

#### **Equipamentos**
```
Slot  Porta   Baud   Regex                      Ativo
────────────────────────────────────────────────────────
1     COM1    9600   /(\d+\.?\d*)/              ✓
2     COM2    9600   /(\d+\.?\d*)/              ✓
3     COM3    9600   /(\d+\.?\d*)/              ✓
4     COM4    9600   /(\d+\.?\d*)/              ✓
5     COM5    9600   /(\d+\.?\d*)/              ✓
6     (vazio) -      -                          ✗
```

#### **Usuários**
```
Usuário    Email      Criado em          [EDITAR][DELETAR]
────────────────────────────────────────────────────────
admin      -          2025-05-15         [EDITAR][DELETAR]
operador   -          2025-05-15         [EDITAR][DELETAR]
```

---

## 5. Cores do Projeto

```
--primary:       #1E3A8A  (Azul escuro)
--primary-hover: #1E40AF  (Azul mais escuro)
--accent:        #10B981  (Verde)
--danger:        #EF4444  (Vermelho)
--warn:          #F59E0B  (Laranja)
--bg:            #F3F4F6  (Cinza claro)
--surface:       #FFFFFF  (Branco)
--sidebar:       #0F172A  (Azul muito escuro)
--text:          #111827  (Cinza escuro)
--text-muted:    #6B7280  (Cinza médio)
--border:        #E5E7EB  (Cinza claro)
```

---

## 6. Tipografia

- **Fonte:** System font (Segoe UI, Inter, Roboto)
- **Título (h1):** 22px, peso 600
- **Título seção (h2):** 18px, peso 600
- **Corpo:** 14px, peso 400
- **Pequeno:** 13px, peso 400
- **Mini:** 12px, peso 400
- **Labels:** 13px, peso 500, cinza

---

## 7. Responsividade

- Desktop: Grid 3×2 para cards
- 1024px ou menos: Grid 2×3
- Sidebar sempre visível em desktop
- Modal ocupa 90% da viewport max-height

