// src/utils/http.ts
import axios from 'axios'

const http = axios.create({
  baseURL: '/', // важное: не внешний домен!
  withCredentials: true, // чтобы сессия/куки работали через наш прокси
})

export default http
