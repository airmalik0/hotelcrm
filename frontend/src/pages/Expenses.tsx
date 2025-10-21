import {
  createExpense,
  createExpenseCategory,
  deleteExpense,
  deleteExpenseCategory,
  getExpenseCategories,
  getExpenses,
  updateExpense,
  updateExpenseCategory,
} from "@/api/expenses"
import type {
  ExpenseCategoryCreate,
  ExpenseCategoryPublic,
  ExpenseCategoryUpdate,
  ExpenseCreate,
  ExpensePublic,
  ExpenseUpdate,
} from "@/client/types.gen"
import { useConfirm } from "@/hooks/useConfirm"
import { handleFormError, showError, showSuccess } from "@/utils/error-handling"
import { formatCurrency, formatDate } from "@/utils/formatters"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Edit2, FolderOpen, Plus, Trash2, X } from "lucide-react"
// React import not needed directly
import { useState } from "react"
import { useForm } from "react-hook-form"

export function Expenses() {
  const [activeTab, setActiveTab] = useState<"expenses" | "categories">(
    "expenses",
  )
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpensePublic | null>(
    null,
  )
  const [editingCategory, setEditingCategory] =
    useState<ExpenseCategoryPublic | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const queryClient = useQueryClient()
  const { confirm, ConfirmDialog } = useConfirm()

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: () => getExpenseCategories({ limit: 100 }),
  })

  // Fetch expenses
  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses", currentPage, itemsPerPage, categoryFilter],
    queryFn: () =>
      getExpenses({
        skip: currentPage * itemsPerPage,
        limit: itemsPerPage,
        category_id: categoryFilter || undefined,
      }),
  })

  const totalPages = expensesData
    ? Math.ceil(expensesData.count / itemsPerPage)
    : 0

  // Debug: log data structure
  console.log("[Expenses] categoriesData:", categoriesData)
  console.log("[Expenses] expensesData:", expensesData)

  return (
    <>
      <div className="grid grid-cols-12 gap-6">
        {/* Header */}
        <div className="col-span-12">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-2xl font-bold text-neutral-900 dark:text-white">
              Expenses
            </h4>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null)
                  setShowCategoryModal(true)
                }}
                className="rounded-lg py-2 px-4 inline-flex items-center gap-2 transition bg-neutral-600 text-white hover:bg-neutral-700"
              >
                <FolderOpen className="w-4 h-4" />
                Add category
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingExpense(null)
                  setShowExpenseModal(true)
                }}
                className="rounded-lg py-2 px-4 inline-flex items-center gap-2 transition bg-primary-600 text-white hover:bg-primary-700"
              >
                <Plus className="w-4 h-4" />
                Add expense
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-neutral-200 dark:border-neutral-600 mb-6">
            <div className="flex gap-6">
              <button
                type="button"
                onClick={() => setActiveTab("expenses")}
                className={`pb-3 px-1 font-medium transition-colors border-b-2 ${
                  activeTab === "expenses"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}
              >
                Expenses
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("categories")}
                className={`pb-3 px-1 font-medium transition-colors border-b-2 ${
                  activeTab === "categories"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}
              >
                Categories
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === "expenses" ? (
          <ExpensesTab
            expensesData={expensesData}
            expensesLoading={expensesLoading}
            categoriesData={categoriesData}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            totalPages={totalPages}
            onEdit={(expense) => {
              setEditingExpense(expense)
              setShowExpenseModal(true)
            }}
            onDelete={async (expense) => {
              const confirmed = await confirm({
                title: "Delete expense",
                message: "Are you sure you want to delete this expense?",
                confirmText: "Delete",
                variant: "danger",
              })
              if (confirmed) {
                try {
                  await deleteExpense(expense.id)
                  queryClient.invalidateQueries({ queryKey: ["expenses"] })
                  showSuccess("Expense deleted")
                } catch (error) {
                  showError(error, "Error deleting expense")
                }
              }
            }}
          />
        ) : (
          <CategoriesTab
            categoriesData={categoriesData}
            onEdit={(category) => {
              setEditingCategory(category)
              setShowCategoryModal(true)
            }}
            onDelete={async (category) => {
              const confirmed = await confirm({
                title: "Delete category",
                message: "Are you sure you want to delete this category?",
                confirmText: "Delete",
                variant: "danger",
              })
              if (confirmed) {
                try {
                  await deleteExpenseCategory(category.id)
                  queryClient.invalidateQueries({
                    queryKey: ["expense-categories"],
                  })
                  showSuccess("Category deleted")
                } catch (error) {
                  showError(error, "Error deleting category")
                }
              }
            }}
          />
        )}
      </div>

      {/* Modals */}
      {showExpenseModal && (
        <ExpenseModal
          expense={editingExpense}
          categories={categoriesData?.data || []}
          onClose={() => {
            setShowExpenseModal(false)
            setEditingExpense(null)
          }}
          onSuccess={() => {
            setShowExpenseModal(false)
            setEditingExpense(null)
            queryClient.invalidateQueries({ queryKey: ["expenses"] })
          }}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowCategoryModal(false)
            setEditingCategory(null)
          }}
          onSuccess={() => {
            setShowCategoryModal(false)
            setEditingCategory(null)
            queryClient.invalidateQueries({ queryKey: ["expense-categories"] })
          }}
        />
      )}

      {ConfirmDialog}
    </>
  )
}

// Expenses Tab Component
interface ExpensesTabProps {
  expensesData: any
  expensesLoading: boolean
  categoriesData: any
  categoryFilter: string
  setCategoryFilter: (value: string) => void
  currentPage: number
  setCurrentPage: (page: number) => void
  itemsPerPage: number
  setItemsPerPage: (items: number) => void
  totalPages: number
  onEdit: (expense: ExpensePublic) => void
  onDelete: (expense: ExpensePublic) => void
}

function ExpensesTab({
  expensesData,
  expensesLoading,
  categoriesData,
  categoryFilter,
  setCategoryFilter,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  totalPages,
  onEdit,
  onDelete,
}: ExpensesTabProps) {
  return (
    <div className="col-span-12">
      <div className="bg-white dark:bg-dark-2 rounded-xl shadow-sm dark:shadow-none overflow-hidden">
        {/* Filters */}
        <div className="border-b border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-6 py-4 flex items-center flex-wrap gap-3 justify-between">
          <div className="flex items-center flex-wrap gap-3">
            <span className="text-base font-medium text-neutral-600 dark:text-neutral-400">
              Show
            </span>
            <select
              className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white ps-3 pe-5 py-1.5 text-sm w-auto"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(0)
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-base font-medium text-neutral-600 dark:text-neutral-400">
              Category
            </span>
            <select
              className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white ps-3 pe-5 py-1.5 text-sm w-auto"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setCurrentPage(0)
              }}
            >
              <option value="">All categories</option>
              {categoriesData?.data?.map((cat: ExpenseCategoryPublic) => (
                <option key={String(cat.id)} value={String(cat.id)}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-600">
                <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900 dark:text-white">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900 dark:text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {expensesLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-600 dark:text-neutral-400">
                    Loading...
                  </td>
                </tr>
              ) : (expensesData?.data?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-600 dark:text-neutral-400">
                    No expenses
                  </td>
                </tr>
              ) : (
                expensesData?.data?.map((expense: ExpensePublic) => (
                  <tr
                    key={String(expense.id)}
                    className="border-b border-neutral-200 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  >
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300">
                      {formatDate(expense.expense_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-900 dark:text-white font-medium">
                      {expense.category ? String(expense.category.name) : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300">
                      {expense.description || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-neutral-900 dark:text-white">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(expense)}
                          className="text-neutral-500 hover:text-neutral-700 p-1"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(expense)}
                          className="text-danger-600 hover:text-danger-700 p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-600 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-500 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
              }
              disabled={currentPage >= totalPages - 1}
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-500 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Categories Tab Component
interface CategoriesTabProps {
  categoriesData: any
  onEdit: (category: ExpenseCategoryPublic) => void
  onDelete: (category: ExpenseCategoryPublic) => void
}

function CategoriesTab({
  categoriesData,
  onEdit,
  onDelete,
}: CategoriesTabProps) {
  return (
    <div className="col-span-12">
      <div className="bg-white dark:bg-dark-2 rounded-xl shadow-sm dark:shadow-none overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {categoriesData?.data?.map((category: ExpenseCategoryPublic) => (
            <div
              key={String(category.id)}
              className="border border-neutral-200 dark:border-neutral-600 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h5 className="font-semibold text-neutral-900 dark:text-white mb-1">
                    {category.name}
                  </h5>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {category.description || "No description"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(category)}
                    className="text-neutral-500 hover:text-neutral-700 p-1"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(category)}
                    className="text-danger-600 hover:text-danger-700 p-1"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {(categoriesData?.data?.length ?? 0) === 0 && (
            <div className="col-span-full text-center py-8 text-neutral-500">
              No categories
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Expense Modal
interface ExpenseModalProps {
  expense: ExpensePublic | null
  categories: ExpenseCategoryPublic[]
  onClose: () => void
  onSuccess: () => void
}

function ExpenseModal({
  expense,
  categories,
  onClose,
  onSuccess,
}: ExpenseModalProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ExpenseCreate | ExpenseUpdate>({
    defaultValues: expense
      ? {
          category_id: String(expense.category_id),
          amount: expense.amount,
          description: expense.description || "",
          expense_date: expense.expense_date
            ? new Date(expense.expense_date).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
        }
      : {
          expense_date: new Date().toISOString().slice(0, 16),
        },
  })

  const mutation = useMutation({
    mutationFn: (data: ExpenseCreate | ExpenseUpdate) =>
      expense
        ? updateExpense(expense.id, data)
        : createExpense(data as ExpenseCreate),
    onSuccess: () => {
      showSuccess(expense ? "Expense updated" : "Expense created")
      onSuccess()
    },
    onError: (error) => {
      handleFormError(
        error,
        (validationErrors) => {
          Object.entries(validationErrors).forEach(([field, message]) => {
            setError(field as any, { message })
          })
        },
        "Error saving expense",
      )
    },
  })

  const onSubmit = (data: ExpenseCreate | ExpenseUpdate) => {
    mutation.mutate(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-dark-2 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
          <h5 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {expense ? "Edit expense" : "New expense"}
          </h5>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Category *
              </label>
              <select
                {...register("category_id", {
                  required: "Please select a category",
                })}
                className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white px-4 py-2"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={String(cat.id)} value={String(cat.id)}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <p className="text-sm text-danger-600 mt-1">
                  {errors.category_id.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                {...register("amount", {
                  required: "Enter an amount",
                  min: {
                    value: 0.01,
                    message: "Amount must be greater than 0",
                  },
                })}
                className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white px-4 py-2"
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-sm text-danger-600 mt-1">
                  {errors.amount.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Date
              </label>
              <input
                type="datetime-local"
                {...register("expense_date")}
                className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Description
              </label>
              <textarea
                {...register("description")}
                rows={3}
                className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white px-4 py-2"
                placeholder="Additional information..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-500 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {mutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Category Modal
interface CategoryModalProps {
  category: ExpenseCategoryPublic | null
  onClose: () => void
  onSuccess: () => void
}

function CategoryModal({ category, onClose, onSuccess }: CategoryModalProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ExpenseCategoryCreate | ExpenseCategoryUpdate>({
    defaultValues: category || undefined,
  })

  const mutation = useMutation({
    mutationFn: (data: ExpenseCategoryCreate | ExpenseCategoryUpdate) =>
      category
        ? updateExpenseCategory(category.id, data)
        : createExpenseCategory(data as ExpenseCategoryCreate),
    onSuccess: () => {
      showSuccess(category ? "Category updated" : "Category created")
      onSuccess()
    },
    onError: (error) => {
      handleFormError(
        error,
        (validationErrors) => {
          Object.entries(validationErrors).forEach(([field, message]) => {
            setError(field as any, { message })
          })
        },
        "Error saving category",
      )
    },
  })

  const onSubmit = (data: ExpenseCategoryCreate | ExpenseCategoryUpdate) => {
    mutation.mutate(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-dark-2 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
          <h5 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {category ? "Edit category" : "New category"}
          </h5>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                {...register("name", { required: "Enter a name" })}
                className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white px-4 py-2"
                placeholder="E.g., Utilities"
              />
              {errors.name && (
                <p className="text-sm text-danger-600 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Description
              </label>
              <textarea
                {...register("description")}
                rows={3}
                className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white px-4 py-2"
                placeholder="Additional information..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-500 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {mutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
