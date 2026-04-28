import axios from 'axios';
import { env } from '../config/env';

export const aiClient = axios.create({ baseURL: env.aiServiceUrl, timeout: 120000 });
