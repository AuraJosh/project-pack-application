export function generateCustomProjectId(address, portalRef, coordinates = null) {
  // 1. Determine Location Code (Sector Code) strictly by Coordinates
  let sectorID = "OUTSIDE_YORK";
  
  if (coordinates && coordinates.lat && coordinates.lng) {
    const latitude = parseFloat(coordinates.lat);
    const longitude = parseFloat(coordinates.lng);
    
    if (latitude >= 53.98 && latitude <= 54.04) {
        if (longitude >= -1.25 && longitude < -1.17) { sectorID = "JGL"; }
        else if (longitude >= -1.17 && longitude < -1.09) { sectorID = "FGT"; }
        else if (longitude >= -1.09 && longitude < -1.01) { sectorID = "TPG"; }
        else if (longitude >= -1.01 && longitude <= -0.93) { sectorID = "BHT"; }
    } else if (latitude >= 53.93 && latitude < 53.98) {
        if (longitude >= -1.25 && longitude < -1.17) { sectorID = "MMS"; }
        else if (longitude >= -1.17 && longitude < -1.09) { sectorID = "PVM"; }
        else if (longitude >= -1.09 && longitude < -1.01) { sectorID = "MKC"; }
        else if (longitude >= -1.01 && longitude <= -0.93) { sectorID = "FBG"; }
    } else if (latitude >= 53.88 && latitude < 53.93) {
        if (longitude >= -1.25 && longitude < -1.17) { sectorID = "TGY"; }
        else if (longitude >= -1.17 && longitude < -1.09) { sectorID = "MAC"; }
        else if (longitude >= -1.09 && longitude < -1.01) { sectorID = "GDF"; }
        else if (longitude >= -1.01 && longitude <= -0.93) { sectorID = "HRK"; }
    }
  }

  // 2. Reversed Numbers Logic (consistent with previous system)
  const numbersOnly = portalRef.replace(/[^0-9]/g, ''); 
  const reversed = numbersOnly.split('').reverse().join(''); 
  
  let formattedNumbers = reversed;
  if (reversed.length > 2) {
    const mainPart = reversed.substring(0, reversed.length - 2);
    const endPart = reversed.substring(reversed.length - 2);
    formattedNumbers = `${mainPart}-${endPart}`;
  }

  // 3. Determine Type Digit (consistent with previous system)
  const TYPE_CODES = { 'FUL': '1', 'LHE': '2', 'OUT': '3' };
  let typeDigit = '1';
  for (const [type, digit] of Object.entries(TYPE_CODES)) {
    if (portalRef.toUpperCase().includes(type)) {
      typeDigit = digit;
      break;
    }
  }

  return `${sectorID}-${formattedNumbers}-${typeDigit}`;
}
