import type {
  ExpenseCategoriesPublic,
  ExpenseCategoryCreate,
  ExpenseCategoryPublic,
  ExpenseCategoryUpdate,
  ExpenseCreate,
  ExpensePublic,
  ExpenseUpdate,
  ExpensesPublic,
  Message,
} from "@/client/types.gen"
import { apiClient } from "@/lib/axios"

// Expense Category API

export interface ExpenseCategoryParams {
  skip?: number
  limit?: number
}

/**
 * Get list of expense categories
 */
export async function getExpenseCategories(
  params?: ExpenseCategoryParams,
): Promise<ExpenseCategoriesPublic> {
  const response = await apiClient.get<ExpenseCategoriesPublic>(
    "/api/v1/expenses/categories",
    {
      params: {
        skip: params?.skip || 0,
        limit: params?.limit || 100,
      },
    },
  )
  return response.data
}

/**
 * Get single expense category by ID
 */
export async function getExpenseCategory(
  categoryId: string,
): Promise<ExpenseCategoryPublic> {
  const response = await apiClient.get<ExpenseCategoryPublic>(
    `/api/v1/expenses/categories/${categoryId}`,
  )
  return response.data
}

/**
 * Create new expense category
 */
export async function createExpenseCategory(
  data: ExpenseCategoryCreate,
): Promise<ExpenseCategoryPublic> {
  const response = await apiClient.post<ExpenseCategoryPublic>(
    "/api/v1/expenses/categories",
    data,
  )
  return response.data
}

/**
 * Update existing expense category
 */
export async function updateExpenseCategory(
  categoryId: string,
  data: ExpenseCategoryUpdate,
): Promise<ExpenseCategoryPublic> {
  const response = await apiClient.put<ExpenseCategoryPublic>(
    `/api/v1/expenses/categories/${categoryId}`,
    data,
  )
  return response.data
}

/**
 * Delete expense category
 */
export async function deleteExpenseCategory(
  categoryId: string,
): Promise<Message> {
  const response = await apiClient.delete<Message>(
    `/api/v1/expenses/categories/${categoryId}`,
  )
  return response.data
}

// Expense API

export interface ExpenseParams {
  skip?: number
  limit?: number
  category_id?: string
}

/**
 * Get list of expenses with optional category filter
 */
export async function getExpenses(
  params?: ExpenseParams,
): Promise<ExpensesPublic> {
  const response = await apiClient.get<ExpensesPublic>("/api/v1/expenses/", {
    params: {
      skip: params?.skip || 0,
      limit: params?.limit || 100,
      category_id: params?.category_id,
    },
  })
  return response.data
}

/**
 * Get single expense by ID
 */
export async function getExpense(expenseId: string): Promise<ExpensePublic> {
  const response = await apiClient.get<ExpensePublic>(
    `/api/v1/expenses/${expenseId}`,
  )
  return response.data
}

/**
 * Create new expense
 */
export async function createExpense(
  data: ExpenseCreate,
): Promise<ExpensePublic> {
  const response = await apiClient.post<ExpensePublic>(
    "/api/v1/expenses/",
    data,
  )
  return response.data
}

/**
 * Update existing expense
 */
export async function updateExpense(
  expenseId: string,
  data: ExpenseUpdate,
): Promise<ExpensePublic> {
  const response = await apiClient.put<ExpensePublic>(
    `/api/v1/expenses/${expenseId}`,
    data,
  )
  return response.data
}

/**
 * Delete expense
 */
export async function deleteExpense(expenseId: string): Promise<Message> {
  const response = await apiClient.delete<Message>(
    `/api/v1/expenses/${expenseId}`,
  )
  return response.data
}
