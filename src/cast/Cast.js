import { decodeUtf8, encodeUtf8 } from "@helios-lang/codec-utils"
import {
    Address,
    AssetClass,
    DatumHash,
    MintingPolicyHash,
    PubKeyHash,
    ScriptHash,
    SpendingCredential,
    StakingCredential,
    StakingHash,
    StakingValidatorHash,
    TimeRange,
    TxId,
    TxOutputDatum,
    TxOutputId,
    ValidatorHash,
    Value
} from "@helios-lang/ledger"
import { None } from "@helios-lang/type-utils"
import {
    ByteArrayData,
    ConstrData,
    IntData,
    ListData,
    MapData,
    decodeBoolData,
    decodeOptionData,
    decodeRealData,
    encodeBoolData,
    encodeOptionData,
    encodeRealData
} from "@helios-lang/uplc"

/**
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("../codegen/index.js").TypeSchema} TypeSchema
 */

/**
 * @template [TStrict=any]
 * @template [TPermissive=any]
 */
export class Cast {
    /**
     * @readonly
     * @type {TypeSchema}
     */
    schema

    /**
     * @param {TypeSchema} schema
     */
    constructor(schema) {
        this.schema = schema
    }

    /**
     * @param {UplcData} data
     * @returns {TStrict}
     */
    fromUplcData(data) {
        return uplcToSchema(this.schema, data)
    }

    /**
     * @param {TPermissive} x
     * @returns {UplcData}
     */
    toUplcData(x) {
        return schemaToUplc(this.schema, x)
    }
}

/**
 * @param {TypeSchema} schema
 * @param {any} x
 * @returns {UplcData}
 */
function schemaToUplc(schema, x) {
    if ("primitiveType" in schema) {
        switch (schema.primitiveType) {
            case "Address":
                return Address.new(x).toUplcData()
            case "Any":
                return new IntData(0n)
            case "AssetClass":
                return AssetClass.new(x).toUplcData()
            case "Bool":
                return encodeBoolData(x)
            case "ByteArray":
                return new ByteArrayData(x)
            case "Credential":
            case "PaymentCredential":
                return SpendingCredential.new(x).toUplcData()
            case "Data":
                return x
            case "DatumHash":
                return DatumHash.new(x).toUplcData()
            case "DCert":
                return x.toUplcData()
            case "Duration":
            case "Int":
                return new IntData(x)
            case "MintingPolicyHash":
                return MintingPolicyHash.new(x).toUplcData()
            case "PubKeyHash":
                return PubKeyHash.new(x).toUplcData()
            case "Real":
                return encodeRealData(x)
            case "ScriptHash":
                return ScriptHash.new(x).toUplcData()
            case "StakingCredential":
                return StakingCredential.new(x).toUplcData()
            case "StakingHash":
                return StakingHash.new(x).toUplcData()
            case "String":
                return new ByteArrayData(encodeUtf8(x))
            case "Time":
                return new IntData(x)
            case "TimeRange":
                return TimeRange.new(x).toUplcData()
            case "TxId":
                return TxId.new(x).toUplcData()
            case "TxOutputDatum":
                return x
                    ? TxOutputDatum.new(x)?.toUplcData() ??
                          new ConstrData(0, [])
                    : new ConstrData(0, [])
            case "TxOutputId":
                return TxOutputId.new(x).toUplcData()
            case "ValidatorHash":
                return ValidatorHash.new(x).toUplcData()
            case "Value":
                return Value.new(x).toUplcData()
            default:
                throw new Error(
                    `not yet implemented for ${schema.primitiveType}`
                )
        }
    } else if ("listItemType" in schema) {
        return new ListData(x.map((x) => schemaToUplc(schema.listItemType, x)))
    } else if ("mapKeyType" in schema) {
        const entries = x instanceof Map ? x.entries() : x
        return new MapData(
            entries.map(([k, v]) => [
                schemaToUplc(schema.mapKeyType, k),
                schemaToUplc(schema.mapValueType, v)
            ])
        )
    } else if ("optionSomeType" in schema) {
        return encodeOptionData(
            x ? schemaToUplc(schema.optionSomeType, x) : None
        )
    } else if ("structFieldTypes" in schema) {
        // TODO: Cip-68 support
        if (schema.structFieldTypes.length == 1) {
            return schemaToUplc(
                schema.structFieldTypes[0].type,
                x[schema.structFieldTypes[0].name]
            )
        } else {
            return new ListData(
                schema.structFieldTypes.map(({ name, type }) =>
                    schemaToUplc(type, x[name])
                )
            )
        }
    } else if ("enumVariantTypes") {
        const variantName = Object.keys(x)[0]
        const variantFields = Object.values(x)[0]
        const tag = schema.enumVariantTypes.findIndex(
            (v) => v.name == variantName
        )

        if (tag == -1) {
            throw new Error(
                `invalid variant ${variantName} (expected: ${schema.enumVariantTypes.map((v) => v.name).join(", ")})`
            )
        }

        return new ConstrData(
            tag,
            schema.enumVariantTypes[tag].fieldTypes.map((f) =>
                schemaToUplc(f.type, variantFields[f.name])
            )
        )
    } else {
        throw new Error(
            `not yet implemented for ${JSON.stringify(schema, undefined, 4)}`
        )
    }
}

/**
 * This should fail when deviating
 * @param {TypeSchema} schema
 * @param {UplcData} data
 * @returns {any}
 */
function uplcToSchema(schema, data) {
    if ("primitiveType" in schema) {
        switch (schema.primitiveType) {
            case "Address":
                return Address.fromUplcData(data)
            case "Any":
                // TODO: should this throw an error?
                return null
            case "Bool":
                return decodeBoolData(data, true)
            case "ByteArray":
                return ByteArrayData.expect(data).bytes
            case "SpendingCredential":
            case "Credential":
                return SpendingCredential.fromUplcData(data)
            case "Data":
                return data
            case "DCert":
                throw new Error(
                    "can't convert UplcData back into DCert (significant loss of information)"
                )
            case "Duration":
            case "Int":
                return IntData.expect(data).value
            case "MintingPolicyHash":
                return MintingPolicyHash.fromUplcData(data)
            case "PubKeyHash":
                return PubKeyHash.fromUplcData(data)
            case "Real":
                return decodeRealData(data)
            case "ScriptHash":
                return ScriptHash.fromUplcData(data)
            case "StakingCredential":
                return StakingCredential.fromUplcData(data)
            case "StakingHash":
                return StakingHash.fromUplcData(data)
            case "StakingValidatorHash":
                return StakingValidatorHash.fromUplcData(data)
            case "String":
                return decodeUtf8(ByteArrayData.expect(data).bytes)
            case "Time":
                return Number(IntData.expect(data).value) // a number has enough precision to represent ms since 1970 for another 142000 years
            case "TimeRange":
                return TimeRange.fromUplcData(data)
            case "TxId":
                return TxId.fromUplcData(data)
            case "TxOutputId":
                return TxOutputId.fromUplcData(data)
            case "ValidatorHash":
                return ValidatorHash.fromUplcData(data)
            case "Value":
                return Value.fromUplcData(data)
            default:
                throw new Error(
                    `not yet implemented for ${schema.primitiveType}`
                )
        }
    } else if ("listItemType" in schema) {
        return ListData.expect(data).items.map((x) =>
            uplcToSchema(schema.listItemType, x)
        )
    } else if ("mapKeyType" in schema) {
        return new Map(
            MapData.expect(data).items.map(([k, v]) => [
                uplcToSchema(schema.mapKeyType, k),
                uplcToSchema(schema.mapValueType, v)
            ])
        )
    } else if ("optionSomeType" in schema) {
        const optionData = decodeOptionData(data)
        return optionData
            ? uplcToSchema(schema.optionSomeType, optionData)
            : None
    } else if ("structFieldTypes" in schema) {
        const nExpected = schema.structFieldTypes.length
        // TODO: Cip-68 support
        if (nExpected == 1) {
            return {
                [schema.structFieldTypes[0].name]: uplcToSchema(
                    schema.structFieldTypes[0].type,
                    data
                )
            }
        } else {
            const fields = ListData.expect(data).items

            if (fields.length != nExpected) {
                throw new Error(
                    `expected ${nExpected} fields in struct, got ${fields.length} fields`
                )
            }

            return Object.fromEntries(
                fields.map((field, i) => [
                    schema.structFieldTypes[i].name,
                    uplcToSchema(schema.structFieldTypes[i].type, field)
                ])
            )
        }
    } else if ("enumVariantTypes" in schema) {
        const { tag, fields } = ConstrData.expect(data)

        const variantSchema = schema.enumVariantTypes[tag]

        if (!variantSchema) {
            throw new Error(`tag ${tag} out of range`)
        }

        const nExpected = variantSchema.fieldTypes.length

        if (fields.length != nExpected) {
            throw new Error(
                `expected ${nExpected} fields for variant ${variantSchema.name} (tag ${tag}), got ${fields.length} fields`
            )
        }

        return {
            [variantSchema.name]: Object.fromEntries(
                fields.map((f, i) => [
                    variantSchema.fieldTypes[i].name,
                    uplcToSchema(variantSchema.fieldTypes[i].type, f)
                ])
            )
        }
    } else {
        throw new Error(
            `not yet implemented for ${JSON.stringify(schema, undefined, 4)}`
        )
    }
}
