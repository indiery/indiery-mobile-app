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

  return {
    vehicles: vehicles.length
  };
}
