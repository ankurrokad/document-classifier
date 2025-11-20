import { faker } from '@faker-js/faker';

export function genPatient() {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const dob = faker.date.between({ from: '1940-01-01', to: '2015-12-31' });
  // simple Health Card Number generator (10 digits)
  const healthCard = faker.string.numeric(10);
  return {
    firstName, lastName,
    fullName: `${firstName} ${lastName}`,
    dob: dob.toISOString().split('T')[0],
    healthCard
  };
}
