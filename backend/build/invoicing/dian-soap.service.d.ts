export declare class DianSoapService {
    private readonly logger;
    private readonly WSDL_URL;
    sendSignedXmlToDian(signedXml: string, fileName: string, testSetId: string): Promise<{
        success: boolean;
        zipKey?: string;
        message: string;
    }>;
}
