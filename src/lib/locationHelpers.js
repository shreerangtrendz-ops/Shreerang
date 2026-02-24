import { Country, State, City } from 'country-state-city';

// Helper to get all countries formatted for Select
export const getAllCountries = () => {
  return Country.getAllCountries().map(c => ({
    label: c.name,
    value: c.isoCode,
    phoneCode: c.phonecode
  }));
};

// Helper to get states for a country
export const getStatesForCountry = (countryCode) => {
  if (!countryCode) return [];
  return State.getStatesOfCountry(countryCode).map(s => ({
    label: s.name,
    value: s.isoCode
  }));
};

// Helper to get cities for a state
export const getCitiesForState = (countryCode, stateCode) => {
  if (!countryCode || !stateCode) return [];
  return City.getCitiesOfState(countryCode, stateCode).map(c => ({
    label: c.name,
    value: c.name // Cities don't always have ISO codes in this lib, names are unique enough per state
  }));
};

// Find ISO codes based on Names (for pre-filling forms from DB data)
export const findLocationCodes = (countryName, stateName) => {
    const allCountries = Country.getAllCountries();
    const country = allCountries.find(c => c.name.toLowerCase() === (countryName || '').toLowerCase());
    
    let countryCode = country ? country.isoCode : '';
    let stateCode = '';

    if (countryCode && stateName) {
        const allStates = State.getStatesOfCountry(countryCode);
        const state = allStates.find(s => s.name.toLowerCase() === stateName.toLowerCase());
        if (state) stateCode = state.isoCode;
    }

    return { countryCode, stateCode };
};

// Pincode Lookup Service (Focused on India for now based on context)
export const lookupPincode = async (pincode) => {
  if (!pincode || pincode.length < 6) return null;
  
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await response.json();
    
    if (data?.[0]?.Status === 'Success') {
      const details = data[0].PostOffice[0];
      const countryName = details.Country; // Usually "India"
      const stateName = details.State;
      const districtName = details.District;
      const blockName = details.Block;

      // Find ISO codes
      const codes = findLocationCodes(countryName, stateName);

      return {
        countryCode: codes.countryCode || 'IN', // Default to India if fuzzy match fails
        countryName: countryName,
        stateCode: codes.stateCode,
        stateName: stateName,
        city: districtName !== "NA" ? districtName : blockName
      };
    }
  } catch (error) {
    console.error("Pincode lookup failed:", error);
  }
  return null;
};