/**
 ** Kei Imada
 ** 20200107
 ** User interface
 */

interface User {
  id: string;
  email: string;
  name: string;
  driver: User | null;
  matched: boolean;
}

export default User;
