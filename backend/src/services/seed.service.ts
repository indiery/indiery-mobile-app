import { env } from '../config/env';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';

export async function seedCoreData() {
  const vehicles = await Promise.all(
    [
      {
        code: 'bike',
        name: '2 Wheeler',
        shortName: 'Bike',
        icon: 'two-wheeler',
        serviceType: 'intracity',
        capacityKg: 20,
        baseFare: 40,
        perKm: 10,
        partnerShare: 0.8,
        etaMinutes: 4,
        active: true
      },
      {
        code: 'mini500',
        name: 'Mini Truck 500 kg',
        shortName: 'Mini 500',
        icon: 'mini-truck',
        serviceType: 'intracity',
        capacityKg: 500,
        baseFare: 200,
        perKm: 20,
        partnerShare: 0.8,
        etaMinutes: 8,
        active: true
      },
      {
        code: 'mini750',
        name: 'Mini Truck 750 kg',
        shortName: 'Mini 750',
        icon: 'truck',
        serviceType: 'intracity',
        capacityKg: 750,
        baseFare: 300,
        perKm: 30,
        partnerShare: 0.8,
        etaMinutes: 11,
        active: true
      },
      {
        code: 'truck2t',
        name: 'Full Truck Load 2 Ton',
        shortName: 'Truck 2T',
        icon: 'truck-heavy',
        serviceType: 'intercity',
        capacityKg: 2000,
        baseFare: 0,
        perKm: 35,
        partnerShare: 0.8,
        etaMinutes: 18,
        active: false
      },
      {
        code: 'truck10t',
        name: 'Full Truck Load 3-10 Ton',
        shortName: 'Truck 10T',
        icon: 'truck-heavy',
        serviceType: 'intercity',
        capacityKg: 10000,
        baseFare: 0,
        perKm: 40,
        partnerShare: 0.8,
        etaMinutes: 18,
        active: false
      }
    ].map((vehicle) =>
      Vehicle.findOneAndUpdate({ code: vehicle.code }, vehicle, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      })
    )
  );

  const bike = vehicles.find((vehicle) => vehicle.code === 'bike') ?? vehicles[0];

  const customer = await User.findOneAndUpdate(
    { phone: env.DEMO_CUSTOMER_PHONE },
    {
      role: 'customer',
      name: 'Arjun Kumar',
      initials: 'AK',
      phone: env.DEMO_CUSTOMER_PHONE,
      email: 'arjun@email.com',
      city: 'Lucknow',
      customerProfile: {
        coins: 340,
        savedAddresses: ['Hazratganj', 'Gomti Nagar', 'Alambagh']
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const partner = await User.findOneAndUpdate(
    { phone: env.DEMO_PARTNER_PHONE },
    {
      role: 'partner',
      name: 'Rajesh Kumar',
      initials: 'RK',
      phone: env.DEMO_PARTNER_PHONE,
      city: 'Lucknow',
      partnerProfile: {
        vehicleId: bike._id,
        vehicleNumber: 'UP32 MX 4401',
        rating: 4.9,
        online: true,
        walletBalance: 4820,
        weeklyOrders: 28,
        kycStatus: 'pending',
        docs: {
          selfie: true,
          pan: true,
          drivingLicence: true,
          rc: false,
          insurance: false,
          bank: false
        }
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    vehicles: vehicles.length,
    customer: customer.phone,
    partner: partner.phone
  };
}
