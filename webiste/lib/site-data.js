export const services = {
  "bike-delivery": {
    title: "Bike Delivery",
    eyebrow: "Fast, lightweight city delivery",
    description: "Send documents, food, medicines, gifts, and parcels up to 20 kg with a verified two-wheeler partner.",
    icon: "BIKE",
    image: "/assets/service-two-wheeler-v2.png",
    includes: ["Doorstep pickup", "Live trip tracking", "Upfront fare estimate", "Delivery confirmation"],
  },
  "mini-truck": {
    title: "Mini Truck",
    eyebrow: "Flexible transport for bulky loads",
    description: "Book a Tata Ace or similar mini truck for furniture, appliances, shop stock, and loads up to 750 kg.",
    icon: "MINI",
    image: "/assets/service-mini-truck-v2.png",
    includes: ["Vehicle matched to your load", "Same-day or scheduled pickup", "Live trip tracking", "Clear distance-based pricing"],
  },
  "commercial-truck": {
    title: "Commercial Truck",
    eyebrow: "More capacity for larger moves",
    description: "Choose from larger commercial vehicles for heavy goods, wholesale stock, equipment, and high-volume city transport.",
    icon: "TRUCK",
    image: "/assets/service-business-v2.png",
    includes: ["Multiple vehicle sizes", "Verified driver partner", "Multi-stop route support", "Business account assistance"],
  },
  "business-delivery": {
    title: "Business Delivery",
    eyebrow: "Reliable dispatch for growing teams",
    description: "Manage recurring store, office, and customer deliveries with centralized booking, trip visibility, and billing support.",
    icon: "B2B",
    image: "/assets/service-business-v2.png",
    includes: ["Recurring route support", "Multi-user booking", "GST-ready invoices", "Priority account assistance"],
  },
  "house-shifting": {
    title: "House & Office Shifting",
    eyebrow: "A managed move from door to door",
    description: "Get packing, loading, transport, unloading, and optional unpacking support for local home and office relocations.",
    icon: "MOVE",
    image: "/assets/service-home-move-v2.png",
    includes: ["Move assessment", "Packing material options", "Trained handling team", "Pickup-to-drop coordination"],
  },
  "driver-partners": {
    title: "Driver Partner Program",
    eyebrow: "Put your vehicle to work",
    description: "Attach your bike, mini truck, or commercial vehicle to Indiery and receive delivery opportunities through the partner platform.",
    icon: "EARN",
    image: "/assets/service-truck.jpg",
    includes: ["Guided onboarding", "Trip request access", "Earnings visibility", "Partner support"],
  },
};

const serviceLinks = Object.entries(services).map(([slug, service]) => [service.title, `/services/${slug}`]);

for (const [slug, service] of Object.entries(services)) {
  service.other = serviceLinks.filter(([, href]) => href !== `/services/${slug}`).slice(0, 4);
}

export const legacyServiceSlugs = {
  "air-freight": "bike-delivery",
  "ocean-freight": "mini-truck",
  "land-express": "commercial-truck",
};

export const posts = {
  "choosing-the-right-vehicle-for-your-delivery": {
    date: "September 18, 2026",
    title: "How to choose the right vehicle for your city delivery",
    image: "/assets/blog-1.jpg",
    intro: "Match the vehicle to your parcel size, weight, handling needs, and route so you only pay for the capacity you need.",
    sections: [
      {
        heading: "Start with size and weight",
        paragraphs: [
          "A bike is ideal for documents and small parcels up to 20 kg. A mini truck suits appliances, furniture, shop stock, and medium loads. Larger commercial vehicles are better for bulky or high-volume goods.",
          "Share accurate dimensions and handling notes while booking. That helps Indiery assign the right partner and prevents delays at pickup.",
        ],
      },
      {
        heading: "Consider the complete move",
        paragraphs: [
          "If you need packing, lifting, or unloading help, choose a managed shifting service instead of a vehicle-only booking. For recurring store dispatches, a business account can simplify billing and repeat routes.",
        ],
      },
    ],
  },
  "preparing-for-a-smooth-house-move": {
    date: "September 5, 2026",
    title: "A simple checklist for a smoother local house move",
    image: "/assets/blog-2.jpg",
    intro: "A little preparation before moving day helps the packing team protect your belongings and complete the move on time.",
    sections: [
      {
        heading: "Prepare before the team arrives",
        paragraphs: [
          "Separate valuables, medicines, documents, and items you will carry yourself. Label fragile belongings and tell the team about stairs, lift restrictions, parking limits, or narrow access points.",
          "Confirm both addresses and a contact person at each location. Clear access information helps the team choose the right vehicle and equipment.",
        ],
      },
      {
        heading: "Keep the essentials close",
        paragraphs: [
          "Pack chargers, toiletries, a change of clothes, keys, and important paperwork in a separate essentials bag. Use the live trip view to follow the vehicle and stay ready at the destination.",
        ],
      },
    ],
  },
  "making-business-deliveries-more-predictable": {
    date: "August 21, 2026",
    title: "Making everyday business deliveries more predictable",
    image: "/assets/blog-3.jpg",
    intro: "Standard booking details, live trip visibility, and repeatable routes help teams spend less time coordinating local deliveries.",
    sections: [
      {
        heading: "Standardize every booking",
        paragraphs: [
          "Record the pickup contact, delivery window, parcel details, and special handling instructions in the same format for every trip. Clear information reduces follow-up calls and failed handoffs.",
          "Choose the vehicle based on the actual load and use scheduled pickup for known dispatch windows. Share live tracking with the receiving contact when a handoff is time-sensitive.",
        ],
      },
      {
        heading: "Build a process that can grow",
        paragraphs: [
          "Start with your most frequent routes, review delays, and keep proof of delivery with each order. Indiery business support can help centralize bookings, invoices, and recurring delivery needs.",
        ],
      },
    ],
  },
};
