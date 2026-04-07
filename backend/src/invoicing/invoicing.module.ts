import { Module } from '@nestjs/common';
import { InvoicingController } from './invoicing.controller';
import { InvoicingService } from './invoicing.service';
import { DianXmlService } from './dian-xml.service';
import { DianCryptoService } from './dian-crypto.service';
import { DianSoapService } from './dian-soap.service';

@Module({
  controllers: [InvoicingController],
  providers: [
    InvoicingService,
    DianXmlService,
    DianCryptoService,
    DianSoapService,
  ],
  exports: [
    InvoicingService,
    DianXmlService,
    DianCryptoService,
    DianSoapService,
  ],
})
export class InvoicingModule {}
