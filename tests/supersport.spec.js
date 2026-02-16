const { test, expect } = require("@playwright/test");

test("Provjera SuperSporta", async ({ page }) => {
  test.setTimeout(120000);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("https://www.supersport.hr/sport");

  const cookies = page.getByRole("button", { name: "Prihvaćam" });
  if (await cookies.isVisible()) await cookies.click();

  const sveKvote = page.getByRole("cell").filter({ hasText: /^\d,\d{2}$/ });
  let odabraniKoefs = [];

  for (let i = 0; i < 2; i++) {
    let uspjeh = false;
    let pokusaji = 0;

    while (!uspjeh && pokusaji < 10) {
      const randomIndex = Math.floor(Math.random() * 30) + 5;
      const celija = sveKvote.nth(randomIndex);

      const jeVidljiv = await celija.isVisible().catch(() => false);
      if (!jeVidljiv) {
        pokusaji++;
        continue;
      }

      const tekstKoefa = await celija.innerText().catch(() => null);
      if (!tekstKoefa) {
        pokusaji++;
        continue;
      }

      const vrijednost = parseFloat(tekstKoefa.replace(",", "."));

      await celija.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await celija.click({ force: true });
      await page.waitForTimeout(4000);

      const tečajSadaTekst = await page
        .locator("[class*='value']")
        .first()
        .innerText()
        .catch(() => "0");
      const tečajSada = parseFloat(tečajSadaTekst.replace(",", "."));

      const ocekivaniTecaj = [...odabraniKoefs, vrijednost].reduce(
        (acc, k) => acc * k,
        1,
      );

      if (Math.abs(tečajSada - ocekivaniTecaj) < 0.01) {
        odabraniKoefs.push(vrijednost);
        console.log(`Dodan par ${i + 1}: ${vrijednost}`);
        uspjeh = true;
      } else {
        console.log(`Par ${vrijednost} se nije dodao. Pokušaj ${pokusaji + 1}`);
        pokusaji++;
      }
    }

    if (!uspjeh) {
      throw new Error(`Nije moguće dodati par ${i + 1} nakon 10 pokušaja.`);
    }
  }

  const ulogIznos = 30;
  const ulogInput = page.locator("input[inputmode='decimal']");
  await ulogInput.waitFor({ state: "visible" });
  await ulogInput.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type(ulogIznos.toString());

  await page.keyboard.press("Enter");
  await page.waitForTimeout(2000);

  const tečajWebTekst = await page
    .locator("[class*='value']")
    .first()
    .innerText();
  const isplataWebTekst = await page
    .locator("[class*='value']")
    .nth(1)
    .innerText();

  const tecajWeb = parseFloat(tečajWebTekst.replace(",", "."));
  const isplataWeb = parseFloat(
    isplataWebTekst.replace(/[^\d,]/g, "").replace(",", "."),
  );

  const ukupanKoef = odabraniKoefs.reduce((acc, k) => acc * k, 1);

  const osnovica = ulogIznos / 1.05;
  const brutoDobitak = osnovica * ukupanKoef;
  const netoDobitak = brutoDobitak - ulogIznos;
  const porez = netoDobitak > 0 ? netoDobitak * 0.1 : 0;
  const mojaIzracunataIsplata = brutoDobitak - porez;

  console.log(`\nKoeficijenti: ${odabraniKoefs.join(" × ")}`);
  console.log(`Tečaj: ${ukupanKoef.toFixed(2)} | Web: ${tecajWeb}`);
  console.log(
    `Isplata: ${mojaIzracunataIsplata.toFixed(2)} € | Web: ${isplataWeb.toFixed(2)} €`,
  );

  const razlika = Math.abs(isplataWeb - mojaIzracunataIsplata);
  console.log(`Razlika: ${razlika.toFixed(2)} €`);

  expect(razlika).toBeLessThan(2);
});
