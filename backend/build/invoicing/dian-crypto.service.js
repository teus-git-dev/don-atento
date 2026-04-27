"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var DianCryptoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DianCryptoService = void 0;
const common_1 = require("@nestjs/common");
const forge = __importStar(require("node-forge"));
const xml_crypto_1 = require("xml-crypto");
let DianCryptoService = DianCryptoService_1 = class DianCryptoService {
    logger = new common_1.Logger(DianCryptoService_1.name);
    signXml(xmlString, p12Buffer, p12Password) {
        try {
            this.logger.log('Extraendo llave privada de .p12...');
            const asn1Obj = forge.asn1.fromDer(p12Buffer.toString('binary'));
            const p12 = forge.pkcs12.pkcs12FromAsn1(asn1Obj, false, p12Password);
            let privateKeyPem = null;
            let certPem = null;
            if (p12.safeContents) {
                for (const safeContents of p12.safeContents) {
                    for (const safeBag of safeContents.safeBags) {
                        if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
                            const key = safeBag.key;
                            if (key) {
                                privateKeyPem = forge.pki.privateKeyToPem(key);
                            }
                        }
                        else if (safeBag.type === forge.pki.oids.certBag) {
                            const cert = safeBag.cert;
                            if (cert) {
                                certPem = forge.pki.certificateToPem(cert);
                            }
                        }
                    }
                }
            }
            if (!privateKeyPem || !certPem) {
                throw new Error('No se pudo extraer el PrivateKey o Certificado del archivo .p12 provisto.');
            }
            this.logger.log('Firmando documento con xml-crypto (XADES-EPES Habilitación)...');
            const sig = new xml_crypto_1.SignedXml();
            sig.addReference("//*[local-name(.)='Invoice']", ['http://www.w3.org/2000/09/xmldsig#enveloped-signature'], 'http://www.w3.org/2001/04/xmlenc#sha256');
            sig.signingKey = privateKeyPem;
            const certX509 = certPem
                .replace('-----BEGIN CERTIFICATE-----', '')
                .replace('-----END CERTIFICATE-----', '')
                .replace(/\r?\n|\r/g, '');
            sig.keyInfoProvider = {
                getKeyInfo: () => {
                    return `<X509Data><X509Certificate>${certX509}</X509Certificate></X509Data>`;
                },
                getKey: () => {
                    return null;
                },
            };
            sig.computeSignature(xmlString);
            const signatureXml = sig.getSignatureXml();
            const finalXml = xmlString.replace('<!-- AQUI VA EL BLOQUE XADES-EPES CUANDO SE FIRME CON EL .P12 -->', signatureXml);
            this.logger.log('Firma electrónica inyectada correctamente.');
            return finalXml;
        }
        catch (error) {
            this.logger.error('Error crítico durante el procesamiento del certificado .p12 / Firma XML', error);
            throw error;
        }
    }
};
exports.DianCryptoService = DianCryptoService;
exports.DianCryptoService = DianCryptoService = DianCryptoService_1 = __decorate([
    (0, common_1.Injectable)()
], DianCryptoService);
//# sourceMappingURL=dian-crypto.service.js.map