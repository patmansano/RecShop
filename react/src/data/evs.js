// Lista de marcas e modelos de veículos elétricos (amostra representativa)
// Pode ser expandida livremente sem alterar o restante do app
export const EVS = {
  'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X'],
  'BYD': ['Dolphin', 'Song', 'Yuan', 'Han', 'Seal', 'Tang'],
  'Nissan': ['Leaf', 'Ariya'],
  'Chevrolet': ['Bolt', 'Bolt EUV'],
  'Renault': ['Zoe', 'Megane E-Tech'],
  'Volkswagen': ['ID.3', 'ID.4', 'ID. Buzz'],
  'Volvo': ['EX30', 'XC40 Recharge', 'C40 Recharge'],
  'BMW': ['i3', 'i4', 'iX1', 'iX3', 'iX'],
  'Audi': ['Q4 e-tron', 'Q8 e-tron', 'e-tron GT'],
  'Hyundai': ['Kona Electric', 'Ioniq 5', 'Ioniq 6'],
  'Kia': ['Niro EV', 'EV6', 'EV9'],
  'JAC': ['E-JS1', 'iEV40', 'iEV20'],
  'Peugeot': ['e-208', 'e-2008'],
  'Fiat': ['500e'],
  'GWM': ['Ora 03'],
  'Chery': ['iCar', 'Arrizo e'],
};

export function getBrandOptions() {
  return Object.keys(EVS).sort();
}

export function getModelsByBrand(brand) {
  return EVS[brand] ? [...EVS[brand]] : [];
}


