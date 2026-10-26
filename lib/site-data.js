export const services = {
  "bike-delivery": {
    category: "local",
    categoryTitle: "Local Deliveries",
    title: "Bike Delivery",
    eyebrow: "Small parcels & lightweight goods (Up to 20 kg)",
    capacity: "20 kg",
    description: "Ideal for documents, food, medicines, retail parcels, electronics, and daily essentials delivered swiftly through the Indiery Customer App.",
    icon: "BIKE",
    image: "/assets/service-bike-cutout.png",
    includes: [
      "Lightweight parcels up to 20 kg",
      "Doorstep pickup & direct dropoff",
      "Live GPS tracking in Customer App",
      "Upfront fare with OTP verification",
    ],
    bookingChannel: "Customer App",
  },
  "loader-delivery": {
    category: "local",
    categoryTitle: "Local Deliveries",
    title: "Loader Delivery",
    eyebrow: "Suitable goods and medium loads (Up to 90 kg)",
    capacity: "90 kg",
    description: "Convenient three-wheeler and e-loader delivery for cartons, equipment, retail stock, and loads up to 90 kg across Lucknow.",
    icon: "LOADER",
    image: "/assets/service-tempo-cutout.png",
    includes: [
      "Mid-weight loads from 20 kg to 90 kg",
      "Quick loading & secure transit",
      "Live trip tracking through the app",
      "Cost-effective city dispatch",
    ],
    bookingChannel: "Customer App",
  },
  "mini-truck-500": {
    category: "goods",
    categoryTitle: "Goods Transport",
    title: "500 kg Mini Truck",
    eyebrow: "Compact commercial goods transport",
    capacity: "500 kg",
    description: "Dependable transport for appliances, shop supplies, cartons, and commercial shipments up to 500 kg with upfront distance-based rates.",
    icon: "MINI500",
    image: "/assets/service-tempo-cutout.png",
    includes: [
      "Payload capacity up to 500 kg",
      "Dimensions suitable for city routes & markets",
      "Direct driver-partner coordination",
      "Customer App booking & digital payments",
    ],
    bookingChannel: "Customer App",
  },
  "mini-truck-750": {
    category: "goods",
    categoryTitle: "Goods Transport",
    title: "750 kg Mini Truck (Tata Ace)",
    eyebrow: "Heavy goods & commercial distribution",
    capacity: "750 kg",
    description: "Popular Tata Ace and equivalent mini trucks for bulk inventory, industrial materials, wholesale goods, and loads up to 750 kg.",
    icon: "MINI750",
    image: "/assets/service-tempo-cutout.png",
    includes: [
      "Payload capacity up to 750 kg",
      "Open and covered bed configurations",
      "Transparent upfront pricing",
      "Live trip tracking and delivery proof",
    ],
    bookingChannel: "Customer App",
  },
  "commercial-truck": {
    category: "goods",
    categoryTitle: "Goods Transport",
    title: "Larger-Capacity Trucks",
    eyebrow: "Higher tonnage through transport partners",
    capacity: "1 Ton to 10+ Tons (Subject to availability)",
    description: "Larger commercial vehicles available through Indiery's network of transport partners for bulk commercial inventory, raw materials, and heavy equipment.",
    icon: "TRUCK",
    image: "/assets/service-business-truck-cutout.png",
    includes: [
      "Multi-ton capacities matched to your cargo",
      "Subject to route and vehicle availability",
      "Transport partner network coordination",
      "Business and individual enquiries welcome",
    ],
    bookingChannel: "Business Enquiry & Customer App",
  },
  "intercity-logistics": {
    category: "intercity",
    categoryTitle: "Intercity Logistics",
    title: "Intercity Logistics (Full Truck Load)",
    eyebrow: "Intercity goods transportation between cities",
    capacity: "Full Truck Load (FTL)",
    description: "Dedicated intercity goods movement connecting Lucknow with Kanpur, Ayodhya, Prayagraj, Varanasi, Gorakhpur, Bareilly, Delhi NCR, and key trade corridors through Indiery's transport partner network.",
    icon: "INTERCITY",
    image: "/assets/service-business-truck-cutout.png",
    includes: [
      "Full Truck Load (FTL) intercity transportation",
      "Suitable trucks for diverse commercial cargo",
      "Direct coordination & delivery updates",
      "Tailored enquiry process for businesses & individuals",
    ],
    bookingChannel: "Dedicated Intercity Enquiry",
  },
};

const serviceLinks = Object.entries(services).map(([slug, service]) => [service.title, `/services/${slug}`]);

for (const [slug, service] of Object.entries(services)) {
  service.other = serviceLinks.filter(([, href]) => href !== `/services/${slug}`).slice(0, 4);
}

export const legacyServiceSlugs = {
  "air-freight": "bike-delivery",
  "ocean-freight": "mini-truck-750",
  "land-express": "commercial-truck",
  "mini-truck": "mini-truck-750",
  "business-delivery": "commercial-truck",
  "house-shifting": "commercial-truck",
};

export const posts = {
  "choosing-the-right-vehicle-for-your-delivery": {
    date: "September 18, 2026",
    title: "How to choose the right vehicle for your goods transportation",
    image: "/assets/blog-1.jpg",
    intro: "Match the vehicle to your goods weight, volume, handling requirements, and route so you transport safely and efficiently.",
    sections: [
      {
        heading: "Start with size and weight",
        paragraphs: [
          "A bike is ideal for urgent small parcels up to 20 kg. A loader handles loads up to 90 kg. Mini trucks (500 kg and 750 kg) handle heavier commercial shipments, wholesale stock, and boxed goods. Larger commercial trucks provide higher capacity for multi-ton requirements.",
          "Always share accurate dimensions and weight while booking through the Customer App or submitting an intercity enquiry. This ensures the correct vehicle is assigned without delays.",
        ],
      },
      {
        heading: "Local vs. Intercity Logistics",
        paragraphs: [
          "For intra-city routes in Lucknow, on-demand bikes and mini trucks can be booked immediately through the Indiery Customer App. For intercity routes connecting Lucknow to other cities, Indiery coordinates full truck loads through verified transport partners.",
        ],
      },
    ],
  },
  "making-business-logistics-more-predictable": {
    date: "August 21, 2026",
    title: "Making everyday business logistics and goods transport predictable",
    image: "/assets/blog-3.jpg",
    intro: "Standard booking details, live trip visibility, and clear communication help businesses streamline local and intercity transport.",
    sections: [
      {
        heading: "Standardize your transport requirements",
        paragraphs: [
          "Record pickup and drop contacts, timing windows, cargo details, and handling instructions consistently. Clear communication ensures independent driver partners execute pickups and drops smoothly.",
          "Businesses transporting goods across Lucknow or to neighboring cities can partner with Indiery for organized, technology-driven coordination.",
        ],
      },
      {
        heading: "Scale with trusted transport partners",
        paragraphs: [
          "Indiery connects retailers, distributors, wholesalers, and manufacturers with a growing network of verified independent transport providers, enabling efficient goods movement without overheads.",
        ],
      },
    ],
  },
};
