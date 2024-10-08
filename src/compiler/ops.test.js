import { describe, it } from "node:test"
import { deepEqual } from "node:assert"
import { expectSome } from "@helios-lang/type-utils"
import { ByteArrayData, IntData } from "@helios-lang/uplc"
import { Cast } from "../cast/index.js"
import { loadCompilerLib, typeCheckScripts } from "./ops.js"

/**
 * @typedef {import("../cast/index.js").CastConfig} CastConfig
 * @typedef {import("../codegen/index.js").TypeSchema} TypeSchema
 */

/**
 * @typedef {CastConfig}
 */
const castConfig = { isMainnet: false }

describe(typeCheckScripts.name, () => {
    it("correctly generates typeschema for enum containing a map", () => {
        const src = `
        spending test

        enum Datum {
            Foo
            Bar { data: Map[String]Data } 
        }
        
        func main(datum: Datum, _) -> Bool {
            datum == datum
        }
        `

        const lib = loadCompilerLib()
        const { validators } = typeCheckScripts(lib, [src])
        const datumTypeSchema = expectSome(validators.test.Datum)

        /**
         * @type {TypeSchema}
         */
        const expectedTypeSchema = {
            kind: "enum",
            id: "__module__test__Datum[]",
            name: "Datum",
            variantTypes: [
                {
                    kind: "variant",
                    tag: 0,
                    id: "__module__test__Datum[]__Foo",
                    name: "Foo",
                    fieldTypes: []
                },
                {
                    kind: "variant",
                    tag: 1,
                    name: "Bar",
                    id: "__module__test__Datum[]__Bar",
                    fieldTypes: [
                        {
                            name: "data",
                            type: {
                                kind: "map",
                                keyType: {
                                    kind: "internal",
                                    name: "String"
                                },
                                valueType: {
                                    kind: "internal",
                                    name: "Data"
                                }
                            }
                        }
                    ]
                }
            ]
        }

        deepEqual(datumTypeSchema, expectedTypeSchema)

        const cast = new Cast(datumTypeSchema, castConfig)

        cast.fromUplcData(
            cast.toUplcData({
                Foo: {}
            })
        )

        cast.fromUplcData(
            cast.toUplcData({
                Bar: {
                    data: [
                        ["hello", new IntData(0)],
                        ["world", new ByteArrayData([])]
                    ]
                }
            })
        )
    })
})
