export const locationData = {
  countries: [
    { name: 'India', code: 'IN', phoneCode: '+91' },
    { name: 'United States', code: 'US', phoneCode: '+1' },
    { name: 'Canada', code: 'CA', phoneCode: '+1' },
    { name: 'United Kingdom', code: 'GB', phoneCode: '+44' },
    { name: 'Australia', code: 'AU', phoneCode: '+61' },
    { name: 'United Arab Emirates', code: 'AE', phoneCode: '+971' },
  ],
  states: {
    'IN': ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry"],
    'US': ["California", "Texas", "Florida", "New York", "Pennsylvania", "Illinois", "Ohio", "Georgia", "North Carolina", "Michigan"],
    'CA': ["Ontario", "Quebec", "British Columbia", "Alberta"],
    'GB': ["England", "Scotland", "Wales", "Northern Ireland"],
    'AU': ["New South Wales", "Victoria", "Queensland", "Western Australia"],
    'AE': ["Dubai", "Abu Dhabi", "Sharjah", "Ajman"]
  },
  cities: {
    // India - Major cities mapped to states
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur"],
    "Delhi": ["New Delhi", "North Delhi", "South Delhi"],
    "Karnataka": ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
    "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Udaipur"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi"],
    "Telangana": ["Hyderabad", "Warangal", "Nizamabad"],
    "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur"],
    // ... Add generic fallback for unmapped states if needed in UI logic
  }
};

export const getCitiesForState = (stateName) => {
  return locationData.cities[stateName] || [];
};