import { Table } from "@ghom/orm"

export default new Table({
  name: "example",
  description: "Example table from the example module",
  columns: (col) => ({
    id: col.increments(),
    key: col.string().unique(),
    value: col.string(),
  }),
})
