/**
 ** Kei Imada
 ** 20200107
 ** DriverRequest interface
 */
import User from './user';

interface DriverRequest {
  id: number;
  screw: User;
  driver: User;
  active: boolean;
  timestamp: string;
}

export default DriverRequest;
