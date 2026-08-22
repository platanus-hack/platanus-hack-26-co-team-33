/** Datos mock de DataLatam: indicadores macro y fichas de empresa. */

export const indicadores: Record<string, Record<string, number | string>> = {
  colombia: { pib_usd_b: 386.1, inflacion_pct: 4.9, tasa_banrep_pct: 8.75, usd_cop: 4012, desempleo_pct: 9.3 },
  mexico: { pib_usd_b: 1893.0, inflacion_pct: 4.2, tasa_banxico_pct: 10.5, usd_mxn: 18.4, desempleo_pct: 2.8 },
  chile: { pib_usd_b: 344.4, inflacion_pct: 3.8, tasa_bcch_pct: 5.0, usd_clp: 942, desempleo_pct: 8.1 },
  argentina: { pib_usd_b: 640.5, inflacion_pct: 42.3, tasa_bcra_pct: 35.0, usd_ars: 1430, desempleo_pct: 6.9 },
  peru: { pib_usd_b: 282.5, inflacion_pct: 2.1, tasa_bcrp_pct: 4.75, usd_pen: 3.71, desempleo_pct: 6.4 },
}

export const empresas: Record<string, Record<string, string | number>> = {
  '900123456': { razon_social: 'Rappi S.A.S.', pais: 'Colombia', sector: 'Tecnología', empleados: 4200, fundada: 2015 },
  '901234567': { razon_social: 'Habi Colombia S.A.S.', pais: 'Colombia', sector: 'Proptech', empleados: 800, fundada: 2019 },
  '830045678': { razon_social: 'Bancolombia S.A.', pais: 'Colombia', sector: 'Financiero', empleados: 35000, fundada: 1945 },
}
