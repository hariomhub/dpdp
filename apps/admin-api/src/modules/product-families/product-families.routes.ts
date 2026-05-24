import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { productFamiliesController } from './product-families.controller'

const router = Router()
router.use(authenticate)

// Product Families
router.get('/',       productFamiliesController.listFamilies)
router.post('/',      productFamiliesController.createFamily)
router.patch('/:id',  productFamiliesController.updateFamily)
router.delete('/:id', productFamiliesController.deleteFamily)

// Products (flat list + standalone CRUD)
router.get('/products',       productFamiliesController.listAllProducts)
router.post('/products',      productFamiliesController.createProduct)
router.patch('/products/:id', productFamiliesController.updateProduct)
router.delete('/products/:id',productFamiliesController.deleteProduct)

// Action → Product assignment
router.post('/actions/:actionId/products', productFamiliesController.setActionProducts)

export default router