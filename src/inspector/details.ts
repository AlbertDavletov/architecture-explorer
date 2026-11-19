import { architecture } from '../model/architecture'
import fixture from './details.json'
import { createDetailsCatalog } from './model'

const catalog = createDetailsCatalog(fixture, architecture)
export const getComponentDetails = (id: string) => catalog.get(id)
