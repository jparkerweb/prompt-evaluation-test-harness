import api from './api'

export const configService = {
  async getConfig() {
    const response = await api.get('/config')
    return response.data.data
  }
}

export default configService