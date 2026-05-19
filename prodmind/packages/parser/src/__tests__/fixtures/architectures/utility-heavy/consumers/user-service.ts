import { capitalize, isEmpty } from '../utils/string-utils';
import { isEmail } from '../utils/validation';
import { formatDate } from '../utils/date-utils';

export function createUserProfile(name: string, email: string, dob: Date): string {
  if (isEmpty(name)) throw new Error('Name required');
  if (!isEmail(email)) throw new Error('Invalid email');
  return `${capitalize(name)} - ${formatDate(dob)} - ${email}`;
}
