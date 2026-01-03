import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para permitir requests desde el frontend
  app.enableCors({
    origin: `${process.env.FRONT_URL}`,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });



  // Configuración de Swagger (OpenAPI)
  const config = new DocumentBuilder()
    .setTitle('API Ticketing System')
    .setDescription('API description')
    .setVersion('1.0')
    .addTag('model')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
