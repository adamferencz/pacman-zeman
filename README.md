# PAC-MAN: THE MAN EDITION 🎮👑

Kompletní webová arkádová hra na motivy Pac-Mana vytvořená v čistém **HTML5, CSS3 a JavaScriptu (Vanilla JS)** bez externích závislostí. Vizuální styl je laděn do moderního modro-černého neonu s retro cyberpunkovými prvky.

---

## 🌐 Živá online verze (GitHub Pages)

Hru můžeš okamžitě hrát online v prohlížeči zde:
👉 **[https://adamferencz.github.io/pacman-zeman/](https://adamferencz.github.io/pacman-zeman/)**

---

## 🚀 Jak hru spustit lokálně

1. Naklonuj repozitář nebo stáhni ZIP.
2. Otevři soubor `index.html` v libovolném moderním webovém prohlížeči (Chrome, Firefox, Edge, Safari).
3. Není potřeba žádný webový server, databáze ani instalace balíčků.
4. Klikni na tlačítko **HRÁT HRU** a bav se!

---

## 🕹️ Ovládání

| Klávesa | Akce |
|---|---|
| **Šipky** / **WASD** | Pohyb Pac-Mana (s vyrovnávací pamětí zatáčení pro plynulý průjezd) |
| **P** / **Escape** | Pozastavení hry (Pauza) |
| **M** | Vypnout / zapnout zvuk (Mute) |
| **Virtuální D-Pad** | Dotykové ovládání pro mobily a tablety |

Na telefonu lze směr změnit také tahem prstu po herním plánu. Tlačítka pod bludištěm fungují i na úzké obrazovce; ovládací panel má přepínač tlačítek a režim celé obrazovky. Hra začíná až klepnutím na **HRÁT HRU** nebo na směrové tlačítko, takže si lze nejdřív přečíst pravidla.

---

## ✨ Splněné studentské požadavky

### 1. Pac-Man zrychluje podle skóre
S přibývajícím skóre se rychlost Pac-Mana plynule stupňuje podle zadané tabulky:
- **0–99 bodů:** 100 % (základní rychlost)
- **100–249 bodů:** 110 %
- **250–499 bodů:** 120 %
- **500–999 bodů:** 135 %
- **1 000–1 999 bodů:** 150 %
- **2 000+ bodů:** 175 %

Aktuální rychlostní multiplikátor se v reálném čase zobrazuje v horním HUDu. Pohyb a kolizní systém jsou optimalizovány nezávisle na FPS, takže ani při 175 % rychlosti nedochází k prolínání zdmi.

### 2. Bonus pro překonávání zdí (Wall-Pass)
- Na mapě se v pravidelných intervalech objevuje zářící tyrkysový artefakt.
- Po sebrání získá Pac-Man na **5 sekund** schopnost procházet vnitřními zdmi bludiště.
- Během efektu je Pac-Man obklopen **tyrkysovou aurou**, v HUDu běží přesný časový odpočet a před vypršením efekt začne varovně blikat.
- Vnější hranice herního plánu nelze opustit.
- **Bezpečný návrat:** Pokud bonus vyprší ve chvíli, kdy se Pac-Man nachází uvnitř zdi, systém automaticky najde nejbližší volné políčko pomocí BFS a hráče tam bezpečně přemístí.

### 3. Modro-černý vizuální styl
- Hluboké černé pozadí (`#030712`) s jemnou mřížkou.
- Neonově azurové zdi s pulzující září (`#00e5ff`).
- Světle modrý Pac-Man s dynamickou animací úst.
- Zářící tečky a duchové v modrofialových tónech.
- Výrazný červeno-zlatý boss s animovanou aurou.

### 4. Boss „The Man“ (Miloš Zeman)
- Po dosažení **1 000 bodů** se spustí poplašná siréna a varování: `⚠️ THE MAN IS COMING! ⚠️`.
- Na mapu vstoupí boss s portrétem Miloše Zemana (`zeman.png`), větší velikostí a pulzující červenou aurou.
- Boss aktivně pronásleduje hráče pomocí **BFS pathfindingu** nejkratší cestou bludištěm.
- **Souboj:** Boss má **3 životy** (zobrazeny v horním ukazateli).
  - Po příchodu bosse se na mapě začnou objevovat energetické útočné lahve (⚡).
  - Po sebrání lahve získá Pac-Man **Super útok na 6 sekund** (zlatá aura).
  - Dotyk s bossem během Super útoku ubere bossovi 1 život, odhodí ho a způsobí zásah.
  - Dotyk s bossem bez aktivního útoku stojí Pac-Mana život.
  - Po 3 zásazích je boss poražen a hráč získá **+500 bodů**.

---

## 🔊 Zvukové efekty (Web Audio API)

Hra obsahuje plně procedurální zvukové efekty generované přímo přes Web Audio API bez nutnosti stahování externích zvukových souborů:
- Zvuk pojídání teček (wakka-wakka)
- Sebrání bonusu (vzestupný syntezátor)
- Poplach příchodu Bosse (varovná siréna)
- Úder do Bosse (úderný výbuch)
- Poražení Bosse (vítězná znělka)
- Ztráta života a konec hry
- Dokončení úrovně

---

## 📁 Struktura projektu

```text
pacman-zeman/
├── index.html                  # Hlavní HTML struktura, HUD, modální okna
├── style.css                   # Cyberpunk neon styl, animace a responzivita
├── game.js                     # Herní engine, AI duchů, Boss BFS, zvuky
├── zeman.png                   # Textura/fotografie pro bosse "The Man"
├── pacman_the_man_prompt.md    # Původní zadání projektu
└── README.md                   # Návod a popis implementace
```
