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
        capacityKg: 20,
        baseFare: 40,
        perKm: 10,
        partnerShare: 0.75,
        etaMinutes: 4
      },
      {
        code: 'mini500',
        name: 'Mini Truck 500 kg',
        shortName: 'Mini 500',
        icon: 'mini-truck',
        capacityKg: 500,
        baseFare: 200,
        perKm: 22,
        partnerShare: 0.76,
        etaMinutes: 8
      },
      {
        code: 'mini750',
        name: 'Mini Truck 750 kg',
        shortName: 'Mini 750',
        icon: 'truck',
        capacityKg: 750,
        baseFare: 300,
        perKm: 28,
        partnerShare: 0.78,
        etaMinutes: 11
      },
      {
        code: 'truck2t',
        name: 'Truck 2 Ton',
        shortName: 'Truck 2T',
        icon: 'truck-heavy',
        capacityKg: 2000,
        baseFare: 1200,
        perKm: 34,
        partnerShare: 0.82,
        etaMinutes: 18
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
