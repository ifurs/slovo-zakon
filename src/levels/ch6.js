// Розділ 6. Legend: src/levels/README.md
export default {
  "name": "Гроза",
  "levels": [
    // 1. Зграя штовхає віддалене слово ПЕРЕМОГА у правило.
    {
      "name": "Спільний поштовх",
      "hint": "Відстань не заважає діяти разом.",
      "solution": "DLDDR",
      "map": [
        "H=1.W=3.C=4&N..",
        "wwwwwwwwwwwwwww",
        "w......w......w",
        "w..h...w..c...w",
        "w..c...w..2...w",
        "w......wA=....w",
        "w..a...w......w",
        "wwwwwwwwwwwwwww"
      ]
    },
    // 2. Віддалений ящик підриває камінь; місцевий лишається поза радіусом.
    {
      "name": "Безпечна відстань",
      "hint": "Гуркіт чути й за стіною.",
      "solution": "LLDRRRRRDRRR",
      "map": [
        "H=1.W=3.A=2....",
        "C=4&N.R=B......",
        "wwwwwwwwwwwwwww",
        "w......w......w",
        "w......w......w",
        "w...ch.wr.c...w",
        "w......w......w",
        "w......w...a..w",
        "wwwwwwwwwwwwwww"
      ]
    },
    // 3. Три суміжні заряди пробивають обидві перегородки.
    {
      "name": "Гніт",
      "hint": "Гуркіт може піти далі за першу перешкоду.",
      "solution": "DLUDRRRRRRRRDDR",
      "map": [
        "H=1.W=3.A=2....",
        "C=4&N.R=B......",
        "wwwwwwwwwwwwwww",
        "w......w...w..w",
        "w......w...w..w",
        "w...ch.wrrrw..w",
        "w......w..cw..w",
        "w......w...w..w",
        "w......w...w.aw",
        "wwwwwwwwwwwwwww"
      ]
    },
    // 4. Вибух прибирає недосяжне правило ВОГОНЬ ЦЕ СМЕРТЬ.
    {
      "name": "Зняти заборону",
      "hint": "Небезпека тримається на одному слові.",
      "solution": "ULDRDDDRRRRRRRR",
      "map": [
        "H=1.W=3.A=2....",
        "C=4&N.R=B......",
        "wwwwwwwwwwwwwww",
        "w......w......w",
        "w...ch.wr.c...w",
        "w......wF=5...w",
        "w......w......w",
        "w......ffffffaw",
        "w......w......w",
        "wwwwwwwwwwwwwww"
      ]
    },
    // 5. Гравець запускає лиса, склавши ЛИС ЦЕ РУХ; лис запалює заряд.
    {
      "name": "Лисяча іскра",
      "hint": "Для небезпечної роботи знайдеться помічник.",
      "solution": "DRRUUDRRRRRDRRR",
      "map": [
        "H=1.W=3.A=2....",
        "R=B............",
        "wwwwwwwwwwwwwww",
        "w......w......w",
        "w.X=...w......w",
        "w......wr...y.w",
        "w.h.9..w......w",
        "w......w...a..w",
        "wwwwwwwwwwwwwww"
      ]
    },
    // 6. Віддалений ящик звужує брід, місцевий завершує переправу.
    {
      "name": "Два береги зграї",
      "hint": "Кожен має зробити свою частину роботи.",
      "solution": "UURDDDLDRRRRRRRRR",
      "map": [
        "H=1.W=3.A=2....",
        "C=4&N.V=6......",
        "wwwwwwwwwwwwwww",
        "w......w......w",
        "w..c...wc.....w",
        "w.h....w......w",
        "w......w......w",
        "w......~~..a..w",
        "w......w......w",
        "wwwwwwwwwwwwwww"
      ]
    },
    // 7. Зграя спершу проводить ключ, а потім ящик у воду.
    {
      "name": "Дистанційна доставка",
      "hint": "Вантажі мають дістатися переправи по черзі.",
      "solution": "UURDDDRRRRRRRRR",
      "map": [
        "H=1.W=3.A=2....",
        "C=4&N.V=6......",
        "K=4&7.D=3&8....",
        "wwwwwwwwwwwwwww",
        "w......w......w",
        "w.....wcw.....w",
        "w..c..wkw.....w",
        "w.h...w.w.....w",
        "w......d~...a.w",
        "w......w......w",
        "w......w......w",
        "wwwwwwwwwwwwwww"
      ]
    },
    // 8. Самі заряди утворюють зграю; ключ треба провести повз уцілілий заряд.
    {
      "name": "Розвести заряди",
      "hint": "Заряди мають триматися осторонь від вантажу.",
      "solution": "LLULLDDDRRDRUULURRRRRDRUULURRRRR",
      "map": [
        "H=1.W=3.A=2....",
        "R=4&N&B........",
        "K=4&7.D=3&8....",
        "wwwwwwwwwwwwwww",
        "w......w...d.aw",
        "w...w..w...wwww",
        "w...rh.wc.rwwww",
        "w.w....w...wwww",
        "w.k....w...wwww",
        "w......w...wwww",
        "wwwwwwwwwwwwwww"
      ]
    },
    // 9. Ланцюг дістається перегородки біля ключа, не зачіпаючи сам ключ.
    {
      "name": "Три удари грому",
      "hint": "Не кожна перепона потребує нового запалу.",
      "solution": "LDLURRRRRRRRRRULLLULDDDDLDRRRRR",
      "map": [
        "H=1.W=3.A=2....",
        "C=4&N.R=B......",
        "K=4&7.D=3&8....",
        "wwwwwwwwwwwwwww",
        "w......w...wwww",
        "w...w..w...wk.w",
        "w...ch.wrrrw..w",
        "w......w.c.w..w",
        "w......w...wwww",
        "w......w...d.aw",
        "w......w...wwww",
        "wwwwwwwwwwwwwww"
      ]
    },
    // 10. Уцілілий після підриву ящик стає мостом для ключа.
    {
      "name": "Після бурі",
      "hint": "Те, що вціліло, ще стане в пригоді.",
      "solution": "LDLLURDLLDDRDRUUULURRRRRRRRRRR",
      "map": [
        "H=1.W=3.A=2....",
        "C=4&N.R=B......",
        "K=4&7.D=3&8.V=6",
        "wwwwwwwwwwwwwww",
        "w......w..wwwww",
        "w...w..w..wwwww",
        "w...ch.wrc~d.aw",
        "w......w..wwwww",
        "w.w....w..wwwww",
        "w.k....w..wwwww",
        "w......w..wwwww",
        "wwwwwwwwwwwwwww"
      ]
    }
  ]
};
